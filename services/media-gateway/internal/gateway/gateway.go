package gateway

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/netphim/media-gateway/internal/config"
	"github.com/netphim/media-gateway/internal/hls"
	"github.com/netphim/media-gateway/internal/security"
	"github.com/netphim/media-gateway/internal/store"
)

type Gateway struct {
	cfg     config.Config
	guard   security.URLGuard
	signer  *security.Signer
	client  *http.Client
	store   store.ManifestStore
	metrics *Metrics
	limiter *RateLimiter
}

func New(cfg config.Config, manifestStore store.ManifestStore) *Gateway {
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
	gateway := &Gateway{
		cfg: cfg, guard: guard, signer: security.NewSigner(cfg.SigningSecret),
		client: client, store: manifestStore, metrics: NewMetrics(),
		limiter: NewRateLimiter(cfg.RatePerSecond, cfg.RateBurst),
	}
	client.CheckRedirect = gateway.checkRedirect
	return gateway
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
	var input struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	target, err := g.guard.Validate(c.Request.Context(), input.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"directUrl": target.String(),
		"proxyUrl":  g.signer.SignedProxyURL(target.String()),
		"expiresIn": 3600,
	})
}

func (g *Gateway) proxy(c *gin.Context) {
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

	if cached, ok := g.store.Get(c.Request.Context(), target.String()); ok && c.GetHeader("Range") == "" {
		g.metrics.manifestHits.Add(1)
		g.writeManifest(c, cached.Content, cached.FinalURL, true)
		return
	}
	g.metrics.manifestMisses.Add(1)
	response, finalURL, err := g.fetch(c.Request.Context(), target, c.GetHeader("Range"))
	if err != nil {
		g.metrics.recordHost(target.Hostname(), false)
		g.fail(c, http.StatusBadGateway, "upstream unavailable")
		return
	}
	defer response.Body.Close()
	g.metrics.recordHost(target.Hostname(), response.StatusCode >= 200 && response.StatusCode < 400)
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		g.fail(c, response.StatusCode, "upstream rejected media request")
		return
	}

	contentType := strings.ToLower(response.Header.Get("Content-Type"))
	path := strings.ToLower(finalURL.Path)
	isManifest := strings.Contains(contentType, "mpegurl") || strings.HasSuffix(path, ".m3u8") || strings.HasSuffix(path, ".m3u")
	if isManifest {
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
	filtered, stats := hls.Filter(source, finalURL, g.signer.SignedProxyURL)
	c.Header("Content-Type", "application/vnd.apple.mpegurl")
	c.Header("Cache-Control", "no-store")
	c.Header("X-NetPhim-Manifest-Cache", map[bool]string{true: "HIT", false: "MISS"}[cached])
	c.Header("X-Cineverse-Ad-Filtered", boolHeader(stats.RemovedSegments+stats.RemovedTags+stats.RemovedURIs > 0))
	c.Header("X-Cineverse-Ad-Segments", strconv.Itoa(stats.RemovedSegments))
	c.Header("X-Cineverse-Ad-Breaks", strconv.Itoa(stats.DetectedBreaks))
	c.Header("X-Cineverse-Ad-Reasons", strings.Join(stats.Reasons, ","))
	c.String(http.StatusOK, filtered)
}

func (g *Gateway) stream(c *gin.Context, response *http.Response) {
	copyHeader(c, response.Header, "Content-Type")
	copyHeader(c, response.Header, "Content-Range")
	copyHeader(c, response.Header, "Accept-Ranges")
	copyHeader(c, response.Header, "Content-Length")
	copyHeader(c, response.Header, "ETag")
	c.Header("Cache-Control", "private, max-age=300")
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

func (g *Gateway) fetch(ctx context.Context, target *url.URL, rangeHeader string) (*http.Response, *url.URL, error) {
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
	response, err := g.client.Do(request)
	if err != nil {
		return nil, nil, err
	}
	return response, response.Request.URL, nil
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
