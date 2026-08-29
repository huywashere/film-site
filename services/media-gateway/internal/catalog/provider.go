package catalog

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type Provider struct {
	Source  string
	Origins []string
	Headers map[string]string
}

type breakerState struct {
	mu          sync.Mutex
	failures    int
	openedUntil time.Time
	lastSuccess time.Time
	lastFailure time.Time
	lastLatency time.Duration
}

func (b *breakerState) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.openedUntil.IsZero() || time.Now().After(b.openedUntil)
}

func (b *breakerState) record(success bool, latency time.Duration) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.lastLatency = latency
	if success {
		b.failures = 0
		b.openedUntil = time.Time{}
		b.lastSuccess = time.Now()
		return
	}
	b.failures++
	b.lastFailure = time.Now()
	if b.failures >= 3 {
		b.openedUntil = time.Now().Add(30 * time.Second)
	}
}

func (b *breakerState) snapshot() map[string]any {
	b.mu.Lock()
	defer b.mu.Unlock()
	status := "healthy"
	if !b.openedUntil.IsZero() && time.Now().Before(b.openedUntil) {
		status = "open"
	} else if b.failures > 0 {
		status = "degraded"
	}
	return map[string]any{
		"status":        status,
		"failures":      b.failures,
		"lastLatencyMs": b.lastLatency.Milliseconds(),
		"lastSuccess":   timeValue(b.lastSuccess),
		"lastFailure":   timeValue(b.lastFailure),
	}
}

func timeValue(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value.UTC().Format(time.RFC3339)
}

type providerClient struct {
	httpClient *http.Client
	maxBytes   int64
	breakers   map[string]*breakerState
}

func newProviderClient(timeout time.Duration, maxBytes int64, providers []Provider) *providerClient {
	breakers := make(map[string]*breakerState, len(providers))
	for _, provider := range providers {
		breakers[provider.Source] = &breakerState{}
	}
	return &providerClient{
		httpClient: &http.Client{
			Timeout: timeout,
			Transport: &http.Transport{
				ForceAttemptHTTP2:     true,
				MaxIdleConns:          128,
				MaxIdleConnsPerHost:   24,
				IdleConnTimeout:       90 * time.Second,
				TLSHandshakeTimeout:   6 * time.Second,
				ResponseHeaderTimeout: timeout,
			},
		},
		maxBytes: maxBytes,
		breakers: breakers,
	}
}

func (c *providerClient) close() {
	if transport, ok := c.httpClient.Transport.(*http.Transport); ok {
		transport.CloseIdleConnections()
	}
}

func (c *providerClient) fetch(ctx context.Context, provider Provider, path string) (map[string]any, error) {
	breaker := c.breakers[provider.Source]
	if breaker != nil && !breaker.allow() {
		return nil, errors.New("provider circuit is open")
	}
	started := time.Now()
	var lastErr error
	for _, origin := range provider.Origins {
		base, err := url.Parse(strings.TrimRight(origin, "/"))
		if err != nil || (base.Scheme != "https" && base.Scheme != "http") || base.Host == "" {
			lastErr = errors.New("invalid configured provider origin")
			continue
		}
		target := strings.TrimRight(base.String(), "/") + "/" + strings.TrimLeft(path, "/")
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
		if err != nil {
			lastErr = err
			continue
		}
		request.Header.Set("Accept", "application/json")
		request.Header.Set("User-Agent", "NetPhim-Catalog-Gateway/1.0")
		for key, value := range provider.Headers {
			request.Header.Set(key, value)
		}
		response, err := c.httpClient.Do(request)
		if err != nil {
			lastErr = err
			continue
		}
		if response.StatusCode < 200 || response.StatusCode >= 300 {
			_, _ = io.CopyN(io.Discard, response.Body, 8*1024)
			_ = response.Body.Close()
			lastErr = fmt.Errorf("upstream status %d", response.StatusCode)
			continue
		}
		reader := io.LimitReader(response.Body, c.maxBytes+1)
		body, readErr := io.ReadAll(reader)
		_ = response.Body.Close()
		if readErr != nil {
			lastErr = readErr
			continue
		}
		if int64(len(body)) > c.maxBytes {
			lastErr = errors.New("provider response exceeds size limit")
			continue
		}
		var payload map[string]any
		if err := json.Unmarshal(body, &payload); err != nil {
			lastErr = err
			continue
		}
		if breaker != nil {
			breaker.record(true, time.Since(started))
		}
		return payload, nil
	}
	if breaker != nil {
		breaker.record(false, time.Since(started))
	}
	if lastErr == nil {
		lastErr = errors.New("provider has no usable origin")
	}
	return nil, lastErr
}

func (c *providerClient) health() map[string]any {
	result := make(map[string]any, len(c.breakers))
	for source, state := range c.breakers {
		result[source] = state.snapshot()
	}
	return result
}
