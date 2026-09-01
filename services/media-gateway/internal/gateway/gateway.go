package gateway

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/netphim/media-gateway/internal/catalog"
	"github.com/netphim/media-gateway/internal/config"
	"github.com/netphim/media-gateway/internal/hls"
	"github.com/netphim/media-gateway/internal/security"
	"github.com/netphim/media-gateway/internal/store"
)

type Gateway struct {
	cfg           config.Config
	guard         security.URLGuard
	signer        *security.Signer
	client        *http.Client
	transport     *http.Transport
	store         store.ManifestStore
	metrics       *Metrics
	limiter       *RateLimiter
	searchLimiter *RateLimiter
	manifests     manifestFlightGroup
	catalog       *catalog.Service
	analysis      store.AnalysisQueue
	results       store.AnalysisResultStore
}

type manifestLoadResult struct {
	manifest store.Manifest
}

type manifestFlight struct {
	done   chan struct{}
	result manifestLoadResult
	err    error
}

type manifestFlightGroup struct {
	mu    sync.Mutex
	calls map[string]*manifestFlight
}

func (g *manifestFlightGroup) Do(ctx context.Context, key string, fn func() (manifestLoadResult, error)) (manifestLoadResult, error, bool) {
	g.mu.Lock()
	if g.calls == nil {
		g.calls = make(map[string]*manifestFlight)
	}
	call, shared := g.calls[key]
	if !shared {
		call = &manifestFlight{done: make(chan struct{})}
		g.calls[key] = call
		go func() {
			call.result, call.err = fn()
			g.mu.Lock()
			delete(g.calls, key)
			close(call.done)
			g.mu.Unlock()
		}()
	}
	g.mu.Unlock()

	select {
	case <-ctx.Done():
		return manifestLoadResult{}, ctx.Err(), shared
	case <-call.done:
		return call.result, call.err, shared
	}
}

func New(cfg config.Config, manifestStore store.ManifestStore, analysisQueues ...store.AnalysisQueue) *Gateway {
	if cfg.InternalToken == "" {
		log.Println("[WARN] MEDIA_INTERNAL_TOKEN is not set; internal endpoints will reject all requests")
	}
	guard := security.URLGuard{
		AllowedHosts: cfg.AllowedHosts,
		RequireHTTPS: cfg.Environment == "release",
	}
	dialer := &net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}
	transport := &http.Transport{
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          256,
		MaxIdleConnsPerHost:   64,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   8 * time.Second,
		ResponseHeaderTimeout: cfg.RequestTimeout,
		DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(address)
			if err != nil {
				return nil, err
			}
			addresses, err := guard.ResolvePublic(ctx, host)
			if err != nil {
				return nil, err
			}
			var lastErr error
			for _, ip := range addresses {
				connection, dialErr := dialer.DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
				if dialErr == nil {
					return connection, nil
				}
				lastErr = dialErr
			}
			return nil, lastErr
		},
	}
	client := &http.Client{
		Transport: transport,
	}
	var analysisQueue store.AnalysisQueue
	if len(analysisQueues) > 0 {
		analysisQueue = analysisQueues[0]
	}
	gateway := &Gateway{
		cfg: cfg, guard: guard, signer: security.NewSigner(cfg.SigningSecret),
		client: client, transport: transport, store: manifestStore, metrics: NewMetrics(),
		limiter:       NewRateLimiter(cfg.RatePerSecond, cfg.RateBurst),
		searchLimiter: NewRateLimiter(cfg.SearchRatePerSecond, cfg.SearchRateBurst),
		catalog:       catalog.New(cfg),
		analysis:      analysisQueue,
	}
	client.CheckRedirect = gateway.checkRedirect
	return gateway
}

func (g *Gateway) Close() {
	if g.transport != nil {
		g.transport.CloseIdleConnections()
	}
	if g.catalog != nil {
		_ = g.catalog.Close()
	}
	if g.results != nil {
		_ = g.results.Close()
	}
}

// SetResults injects an AnalysisResultStore so the gateway can serve cached
// Rust worker results. Call before Register().
func (g *Gateway) SetResults(r store.AnalysisResultStore) {
	g.results = r
}

func (g *Gateway) Register(router *gin.Engine) {
	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "netphim-media-gateway"})
	})
	router.GET("/readyz", g.ready)
	router.GET("/metrics", g.requireInternalToken(), g.metrics.Handler)
	router.GET("/v1/providers/health", g.requireInternalToken(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"providers": g.metrics.Hosts()})
	})
	router.POST("/v1/streams/resolve", g.requireInternalToken(), g.resolveStream)
	router.GET("/api/hls-proxy", g.rateLimit(), g.proxy)
	if g.cfg.CatalogEnabled && g.catalog != nil {
		g.catalog.Register(router, g.rateLimitCatalog())
	}
	// Analysis endpoints (all require internal token, wired inside helper).
	g.registerAnalysisRoutes(router)
}

func (g *Gateway) ready(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 750*time.Millisecond)
	defer cancel()
	if g.store != nil && !g.store.Ready(ctx) {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready", "redis": "unavailable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

func (g *Gateway) resolveStream(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, g.cfg.MaxResolveBytes)
	var input struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "request body too large"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	target, err := g.guard.Validate(c.Request.Context(), input.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	response := gin.H{
		"directUrl": target.String(),
		"proxyUrl":  g.signer.SignedProxyURL(target.String()),
		"expiresIn": 3600,
	}
	// Attach any cached analysis result so callers get markers/health in one hop.
	if g.results != nil {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 500*time.Millisecond)
		if result, ok := g.results.GetResult(ctx, target.String()); ok {
			response["analysis"] = result
		}
		cancel()
	}
	c.JSON(http.StatusOK, response)
}

func (g *Gateway) proxy(c *gin.Context) {
	started := time.Now()
	defer func() { g.metrics.recordRequest(time.Since(started)) }()
	g.metrics.requests.Add(1)
	rawURL := c.Query("url")
	if !g.signer.Verify(rawURL, c.Query("expires"), c.Query("signature")) {
		g.fail(c, http.StatusUnauthorized, "invalid media signature")
		return
	}
	target, err := g.guard.Validate(c.Request.Context(), rawURL)
	if err != nil {
		g.fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if hls.IsLikelyAdURL(target.String()) {
		c.Header("X-NetPhim-Ad-Blocked", "uri")
		c.Status(http.StatusNoContent)
		return
	}

	rangeHeader := c.GetHeader("Range")
	likelyManifest := isLikelyManifestURL(target)
	if rangeHeader == "" && likelyManifest {
		if cached, ok := g.store.Get(c.Request.Context(), target.String()); ok {
			g.metrics.manifestHits.Add(1)
			g.writeManifest(c, cached.Content, cached.FinalURL, true)
			return
		}
		g.metrics.manifestMisses.Add(1)
		manifest, err := g.loadManifest(c.Request.Context(), target)
		if err != nil {
			g.fail(c, http.StatusBadGateway, "upstream manifest unavailable")
			return
		}
		g.writeManifest(c, manifest.Content, manifest.FinalURL, false)
		return
	}

	response, finalURL, err := g.fetch(c.Request.Context(), target, rangeHeader)
	if err != nil {
		g.fail(c, http.StatusBadGateway, "upstream unavailable")
		return
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		g.fail(c, response.StatusCode, "upstream rejected media request")
		return
	}

	contentType := strings.ToLower(response.Header.Get("Content-Type"))
	path := strings.ToLower(finalURL.Path)
	isManifest := strings.Contains(contentType, "mpegurl") || strings.HasSuffix(path, ".m3u8") || strings.HasSuffix(path, ".m3u")
	if isManifest {
		g.metrics.manifestMisses.Add(1)
		if response.ContentLength > g.cfg.MaxManifestBytes {
			g.fail(c, http.StatusBadGateway, "manifest exceeds size limit")
			return
		}
		content, err := readLimited(response.Body, g.cfg.MaxManifestBytes)
		if err != nil {
			g.fail(c, http.StatusBadGateway, err.Error())
			return
		}
		manifest := store.Manifest{Content: string(content), FinalURL: finalURL.String()}
		g.store.Set(c.Request.Context(), target.String(), manifest)
		g.writeManifest(c, manifest.Content, manifest.FinalURL, false)
		return
	}
	if strings.Contains(contentType, "text/html") || strings.Contains(contentType, "application/json") {
		g.fail(c, http.StatusBadGateway, "unexpected upstream content type")
		return
	}
	g.stream(c, response)
}

func (g *Gateway) writeManifest(c *gin.Context, source, finalURL string, cached bool) {
	if !cached && g.analysis != nil {
		job := store.NewAnalysisJob(finalURL, providerFromURL(finalURL))
		job.TraceID = requestIDFromContext(c)
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), g.cfg.AnalysisTimeout)
			defer cancel()
			if err := g.analysis.Enqueue(ctx, job); err != nil {
				g.metrics.errors.Add(1)
			}
		}()
	}
	filtered, stats := hls.Filter(source, finalURL, g.signer.SignedProxyURL)
	c.Header("Content-Type", "application/vnd.apple.mpegurl")
	c.Header("Cache-Control", "no-store")
	c.Header("X-NetPhim-Manifest-Cache", map[bool]string{true: "HIT", false: "MISS"}[cached])
	c.Header("X-NetPhim-Ad-Filtered", boolHeader(stats.RemovedSegments+stats.RemovedTags+stats.RemovedURIs > 0))
	c.Header("X-NetPhim-Ad-Segments", strconv.Itoa(stats.RemovedSegments))
	c.Header("X-NetPhim-Ad-Breaks", strconv.Itoa(stats.DetectedBreaks))
	c.Header("X-NetPhim-Ad-Reasons", strings.Join(stats.Reasons, ","))
	c.String(http.StatusOK, filtered)
}

func providerFromURL(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "unknown"
	}
	host := strings.ToLower(parsed.Hostname())
	switch {
	case strings.Contains(host, "phimapi"), strings.Contains(host, "kkphim"):
		return "kkphim"
	case strings.Contains(host, "ophim"), strings.Contains(host, "opstream"):
		return "ophim"
	case strings.Contains(host, "nguonc"), strings.Contains(host, "streamc"):
		return "nguonc"
	case strings.Contains(host, "vsmov"), strings.Contains(host, "streamvsmov"):
		return "vsmov"
	case strings.Contains(host, "vicdn"):
		return "vicdn"
	default:
		return "unknown"
	}
}

func (g *Gateway) stream(c *gin.Context, response *http.Response) {
	copyHeader(c, response.Header, "Content-Type")
	copyHeader(c, response.Header, "Content-Range")
	copyHeader(c, response.Header, "Accept-Ranges")
	copyHeader(c, response.Header, "Content-Length")
	copyHeader(c, response.Header, "ETag")
	c.Header("Cache-Control", "public, max-age=86400, s-maxage=86400, immutable")
	c.Status(response.StatusCode)
	g.metrics.activeStreams.Add(1)
	defer g.metrics.activeStreams.Add(-1)
	written, err := io.Copy(c.Writer, response.Body)
	if written > 0 {
		g.metrics.bytes.Add(uint64(written))
	}
	if err != nil && !errors.Is(err, context.Canceled) {
		g.metrics.errors.Add(1)
	}
}

func (g *Gateway) loadManifest(ctx context.Context, target *url.URL) (store.Manifest, error) {
	result, err, shared := g.manifests.Do(ctx, target.String(), func() (manifestLoadResult, error) {
		fetchContext, cancel := context.WithTimeout(context.Background(), g.manifestFetchTimeout())
		defer cancel()

		if cached, ok := g.store.Get(fetchContext, target.String()); ok {
			return manifestLoadResult{manifest: cached}, nil
		}
		response, finalURL, err := g.fetch(fetchContext, target, "")
		if err != nil {
			return manifestLoadResult{}, err
		}
		defer response.Body.Close()
		if response.StatusCode < 200 || response.StatusCode >= 300 {
			return manifestLoadResult{}, fmt.Errorf("upstream manifest status %d", response.StatusCode)
		}
		contentType := strings.ToLower(response.Header.Get("Content-Type"))
		path := strings.ToLower(finalURL.Path)
		if !strings.Contains(contentType, "mpegurl") && !strings.HasSuffix(path, ".m3u8") && !strings.HasSuffix(path, ".m3u") {
			return manifestLoadResult{}, fmt.Errorf("unexpected manifest content type")
		}
		if response.ContentLength > g.cfg.MaxManifestBytes {
			return manifestLoadResult{}, fmt.Errorf("manifest exceeds size limit")
		}
		content, err := readLimited(response.Body, g.cfg.MaxManifestBytes)
		if err != nil {
			return manifestLoadResult{}, err
		}
		manifest := store.Manifest{Content: string(content), FinalURL: finalURL.String()}
		g.store.Set(fetchContext, target.String(), manifest)
		return manifestLoadResult{manifest: manifest}, nil
	})
	if shared {
		g.metrics.manifestShared.Add(1)
	}
	if err != nil {
		return store.Manifest{}, err
	}
	return result.manifest, nil
}

func (g *Gateway) manifestFetchTimeout() time.Duration {
	attempts := time.Duration(g.cfg.RetryAttempts)
	return g.cfg.RequestTimeout*attempts + g.cfg.RetryBackoff*(1<<attempts) + time.Second
}

func (g *Gateway) fetch(ctx context.Context, target *url.URL, rangeHeader string) (*http.Response, *url.URL, error) {
	var lastErr error
	for attempt := 0; attempt < g.cfg.RetryAttempts; attempt++ {
		response, finalURL, err := g.fetchOnce(ctx, target, rangeHeader)
		if err == nil && !retryableStatus(response.StatusCode) {
			return response, finalURL, nil
		}
		if err == nil && attempt+1 >= g.cfg.RetryAttempts {
			return response, finalURL, nil
		}
		if err != nil {
			lastErr = err
			if !retryableError(err) || attempt+1 >= g.cfg.RetryAttempts {
				return nil, nil, err
			}
		}
		if response != nil {
			_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 8*1024))
			_ = response.Body.Close()
		}
		g.metrics.recordRetry(target.Hostname())
		if err := waitForRetry(ctx, g.cfg.RetryBackoff, attempt); err != nil {
			return nil, nil, err
		}
	}
	return nil, nil, lastErr
}

func (g *Gateway) fetchOnce(ctx context.Context, target *url.URL, rangeHeader string) (*http.Response, *url.URL, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, target.String(), nil)
	if err != nil {
		return nil, nil, err
	}
	request.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36")
	request.Header.Set("Referer", target.Scheme+"://"+target.Host+"/")
	request.Header.Set("Origin", target.Scheme+"://"+target.Host)
	if rangeHeader != "" {
		request.Header.Set("Range", rangeHeader)
	}
	started := time.Now()
	response, err := g.client.Do(request)
	duration := time.Since(started)
	if err != nil {
		if response != nil && response.Body != nil {
			_ = response.Body.Close()
		}
		g.metrics.recordHost(target.Hostname(), false, isTimeoutError(err), duration)
		return nil, nil, err
	}
	success := response.StatusCode >= 200 && response.StatusCode < 400
	timedOut := response.StatusCode == http.StatusRequestTimeout || response.StatusCode == http.StatusGatewayTimeout
	g.metrics.recordHost(target.Hostname(), success, timedOut, duration)
	finalURL := target
	if response.Request != nil && response.Request.URL != nil {
		finalURL = response.Request.URL
	}
	return response, finalURL, nil
}

func (g *Gateway) checkRedirect(request *http.Request, via []*http.Request) error {
	if len(via) > g.cfg.MaxRedirects {
		return fmt.Errorf("too many redirects")
	}
	validated, err := g.guard.Validate(request.Context(), request.URL.String())
	if err != nil {
		return err
	}
	request.URL = validated
	return nil
}

func (g *Gateway) fail(c *gin.Context, status int, message string) {
	g.metrics.errors.Add(1)
	c.JSON(status, gin.H{"error": message})
}

func (g *Gateway) rateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !g.limiter.Allow(c.ClientIP()) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many media requests"})
			return
		}
		c.Next()
	}
}

// rateLimitCatalog applies a stricter, separate token bucket for catalog and
// search routes so that a search flood cannot starve the HLS proxy limiter.
func (g *Gateway) rateLimitCatalog() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !g.searchLimiter.Allow(c.ClientIP()) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many catalog requests"})
			return
		}
		c.Next()
	}
}

func (g *Gateway) requireInternalToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		expected := g.cfg.InternalToken
		received := c.GetHeader("X-Media-Internal-Token")
		if expected == "" || len(expected) != len(received) || subtle.ConstantTimeCompare([]byte(expected), []byte(received)) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Next()
	}
}

func copyHeader(c *gin.Context, source http.Header, key string) {
	if value := source.Get(key); value != "" {
		c.Header(key, value)
	}
}

func readLimited(reader io.Reader, limit int64) ([]byte, error) {
	content, err := io.ReadAll(io.LimitReader(reader, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(content)) > limit {
		return nil, fmt.Errorf("manifest exceeds size limit")
	}
	return content, nil
}

func boolHeader(value bool) string {
	if value {
		return "1"
	}
	return "0"
}

func isLikelyManifestURL(target *url.URL) bool {
	path := strings.ToLower(target.Path)
	return strings.HasSuffix(path, ".m3u8") || strings.HasSuffix(path, ".m3u")
}

func retryableStatus(status int) bool {
	switch status {
	case http.StatusRequestTimeout, http.StatusTooEarly, http.StatusInternalServerError,
		http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	default:
		return false
	}
}

func retryableError(err error) bool {
	if errors.Is(err, context.Canceled) {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var networkError net.Error
	return errors.As(err, &networkError)
}

func isTimeoutError(err error) bool {
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var networkError net.Error
	return errors.As(err, &networkError) && networkError.Timeout()
}

func waitForRetry(ctx context.Context, base time.Duration, attempt int) error {
	delay := base * time.Duration(1<<attempt)
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}
