package catalog

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type hedgedResult struct {
	origin string
	body   []byte
	err    error
}

func getProviderProxyTTL(path string) int {
	clean := strings.ToLower(path)
	if strings.Contains(clean, "phim-moi-cap-nhat") {
		return 180
	}
	if strings.Contains(clean, "phim/") || strings.Contains(clean, "phim-") {
		return 600
	}
	if strings.Contains(clean, "the-loai") || strings.Contains(clean, "quoc-gia") || strings.Contains(clean, "nam-phat-hanh") {
		return 3600
	}
	if strings.Contains(clean, "tim-kiem") {
		return 600
	}
	return 300
}

func (s *Service) getProviderOrigins(provider string) []string {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "kkphim":
		if len(s.cfg.KKPhimOrigins) > 0 {
			return s.cfg.KKPhimOrigins
		}
		return []string{"https://phimapi.com"}
	case "nguonc":
		if len(s.cfg.NguonCOrigins) > 0 {
			return s.cfg.NguonCOrigins
		}
		return []string{"https://phim.nguonc.com/api"}
	case "vsmov":
		if len(s.cfg.VSMovOrigins) > 0 {
			return s.cfg.VSMovOrigins
		}
		return []string{"https://vsmov.com/api"}
	case "vicdn":
		if len(s.cfg.ViCDNOrigins) > 0 {
			return s.cfg.ViCDNOrigins
		}
		return []string{"https://vicdn.cc/api", "https://api.vicdn.cc/api"}
	default:
		return nil
	}
}

// executeHedgedFetch calls origins in a racing/hedged pattern.
// If an origin does not respond in hedgeDelay, it launches the next origin concurrently.
// The first origin to respond with HTTP 200 and valid JSON wins, cancelling the others.
func (s *Service) executeHedgedFetch(parentCtx context.Context, origins []string, subPath string, rawQuery string) (string, []byte, error) {
	if len(origins) == 0 {
		return "", nil, fmt.Errorf("no origins configured")
	}

	ctx, cancel := context.WithTimeout(parentCtx, 8*time.Second)
	defer cancel()

	respCh := make(chan hedgedResult, len(origins))
	var startedCount int
	var mu sync.Mutex

	fetchSingle := func(origin string) {
		targetURL := strings.TrimRight(origin, "/") + "/" + strings.TrimLeft(subPath, "/")
		if rawQuery != "" {
			targetURL += "?" + rawQuery
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
		if err != nil {
			respCh <- hedgedResult{origin: origin, err: err}
			return
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", "FlexPhim-Catalog-Gateway/1.0")

		client := s.client.httpClient
		if client == nil {
			client = http.DefaultClient
		}
		resp, err := client.Do(req)
		if err != nil {
			respCh <- hedgedResult{origin: origin, err: err}
			return
		}
		defer func() {
			_ = resp.Body.Close()
		}()

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			_, _ = io.CopyN(io.Discard, resp.Body, 4*1024)
			respCh <- hedgedResult{origin: origin, err: fmt.Errorf("upstream %s status %d", origin, resp.StatusCode)}
			return
		}

		reader := io.LimitReader(resp.Body, 10*1024*1024)
		body, err := io.ReadAll(reader)
		if err != nil {
			respCh <- hedgedResult{origin: origin, err: err}
			return
		}

		// Ensure it is valid JSON
		var testJSON any
		if jsonErr := json.Unmarshal(body, &testJSON); jsonErr != nil {
			respCh <- hedgedResult{origin: origin, err: fmt.Errorf("invalid json from %s: %w", origin, jsonErr)}
			return
		}

		respCh <- hedgedResult{origin: origin, body: body, err: nil}
	}

	// Launch first origin
	mu.Lock()
	startedCount++
	mu.Unlock()
	go fetchSingle(origins[0])

	nextOriginIdx := 1
	timer := time.NewTimer(350 * time.Millisecond)
	defer timer.Stop()

	var lastErr error
	completedCount := 0

	for {
		select {
		case <-ctx.Done():
			if lastErr != nil {
				return "", nil, lastErr
			}
			return "", nil, ctx.Err()

		case <-timer.C:
			// Hedge timeout: launch next origin if available
			if nextOriginIdx < len(origins) {
				orig := origins[nextOriginIdx]
				nextOriginIdx++
				mu.Lock()
				startedCount++
				mu.Unlock()
				go fetchSingle(orig)
				timer.Reset(350 * time.Millisecond)
			}

		case res := <-respCh:
			completedCount++
			if res.err == nil && len(res.body) > 0 {
				cancel() // First winner!
				return res.origin, res.body, nil
			}
			lastErr = res.err

			// If current origin failed early and more origins exist, launch next origin immediately
			if nextOriginIdx < len(origins) {
				orig := origins[nextOriginIdx]
				nextOriginIdx++
				mu.Lock()
				startedCount++
				mu.Unlock()
				go fetchSingle(orig)
				timer.Reset(350 * time.Millisecond)
			} else if completedCount >= startedCount {
				return "", nil, lastErr
			}
		}
	}
}

func (s *Service) providerProxyHandler(c *gin.Context) {
	providerName := strings.TrimSpace(c.Param("provider"))
	origins := s.getProviderOrigins(providerName)
	if len(origins) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Nhà cung cấp không hợp lệ: %s", providerName)})
		return
	}

	subPath := c.Param("path")
	rawQuery := c.Request.URL.RawQuery

	cacheKey := fmt.Sprintf("proxy:%s:%s?%s", providerName, subPath, rawQuery)
	ttl := getProviderProxyTTL(subPath)

	// 1. Fast Cache HIT check (Memory / Redis)
	if cached, ok := s.cache.Get(c.Request.Context(), cacheKey); ok && len(cached) > 0 {
		c.Header("Content-Type", "application/json; charset=utf-8")
		c.Header("X-NetPhim-Cache", "HIT")
		c.Header("X-Provider", providerName)
		c.Header("X-Source", "MediaGateway-Go")
		c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d, stale-while-revalidate=%d", minInt(ttl, 1800), ttl, ttl*2))
		c.Status(http.StatusOK)
		_, _ = c.Writer.Write(cached)
		return
	}

	// 2. Coalesce concurrent requests with singleflight
	data, err, _ := s.flights.do(c.Request.Context(), cacheKey, func() ([]byte, error) {
		winningOrigin, body, fetchErr := s.executeHedgedFetch(c.Request.Context(), origins, subPath, rawQuery)
		if fetchErr != nil {
			return nil, fetchErr
		}

		// Cache successful body
		if s.cache != nil && len(body) > 0 {
			s.cache.Set(c.Request.Context(), cacheKey, body, time.Duration(ttl)*time.Second)
		}

		c.Header("X-Provider-Winning-Origin", winningOrigin)
		return body, nil
	})

	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error":   true,
			"message": fmt.Sprintf("Lỗi kết nối %s API: %v", providerName, err),
		})
		return
	}

	c.Header("Content-Type", "application/json; charset=utf-8")
	c.Header("X-NetPhim-Cache", "MISS")
	c.Header("X-Provider", providerName)
	c.Header("X-Source", "MediaGateway-Go")
	c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d, stale-while-revalidate=%d", minInt(ttl, 1800), ttl, ttl*2))
	c.Status(http.StatusOK)
	_, _ = c.Writer.Write(data)
}
