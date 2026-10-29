package gateway

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

var defaultAllowedImageHosts = []string{
	"image.tmdb.org",
	"img.phimapi.com",
	"phimimg.com",
	"img.ophim.live",
	"ophim1.com",
	"images.nguonc.com",
	"phim.nguonc.com",
	"img.nguonc.com",
	"*.onflixcdn.com",
	"onflixcdn.com",
	"*.xink.pro",
	"xink.pro",
	"*.vicdn.cc",
	"vicdn.cc",
	"*.vodphim.com",
	"vodphim.com",
	"*.r2.dev",
	"ui-avatars.com",
	"lh3.googleusercontent.com",
	"*.googleusercontent.com",
	"avatars.githubusercontent.com",
	"*.motphim.net",
	"motphim.net",
	"*.jsdelivr.net",
	"raw.githubusercontent.com",
}

var imageHTTPClient = &http.Client{
	Timeout: 12 * time.Second,
	Transport: &http.Transport{
		ForceAttemptHTTP2:   true,
		MaxIdleConns:        128,
		MaxIdleConnsPerHost: 24,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 6 * time.Second,
	},
}

func isImageHostAllowed(host string) bool {
	host = strings.ToLower(strings.TrimSuffix(strings.TrimSpace(host), "."))
	for _, pattern := range defaultAllowedImageHosts {
		pattern = strings.ToLower(strings.TrimSuffix(strings.TrimSpace(pattern), "."))
		if pattern == host {
			return true
		}
		matched, err := filepath.Match(pattern, host)
		if err == nil && matched {
			return true
		}
	}
	return false
}

func isPublicHostIP(ctx context.Context, host string) bool {
	if host == "localhost" || host == "127.0.0.1" || host == "::1" {
		return true
	}
	if ip := net.ParseIP(host); ip != nil {
		return isPublicNetIP(ip)
	}
	resolver := net.DefaultResolver
	addrs, err := resolver.LookupIP(ctx, "ip", host)
	if err != nil || len(addrs) == 0 {
		return false
	}
	for _, addr := range addrs {
		if !isPublicNetIP(addr) {
			return false
		}
	}
	return true
}

func isPublicNetIP(ip net.IP) bool {
	return ip != nil &&
		!ip.IsPrivate() &&
		!ip.IsLoopback() &&
		!ip.IsLinkLocalMulticast() &&
		!ip.IsLinkLocalUnicast() &&
		!ip.IsUnspecified() &&
		!ip.IsMulticast()
}

func validateImageURL(ctx context.Context, rawURL string) (*url.URL, error) {
	if len(rawURL) == 0 || len(rawURL) > 4096 {
		return nil, fmt.Errorf("invalid image URL length")
	}
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Hostname() == "" {
		return nil, fmt.Errorf("invalid image URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("invalid image scheme")
	}
	isLocal := parsed.Hostname() == "localhost" || parsed.Hostname() == "127.0.0.1" || parsed.Hostname() == "::1"
	if parsed.User != nil || (!isLocal && parsed.Port() != "" && parsed.Port() != "80" && parsed.Port() != "443") {
		return nil, fmt.Errorf("forbidden image target port/auth")
	}
	if !isImageHostAllowed(parsed.Hostname()) {
		return nil, fmt.Errorf("image host %s is not allowed", parsed.Hostname())
	}
	if !isPublicHostIP(ctx, parsed.Hostname()) {
		return nil, fmt.Errorf("private image target is forbidden")
	}
	return parsed, nil
}

func (g *Gateway) imageProxy(c *gin.Context) {
	rawTarget := strings.TrimSpace(c.Query("url"))
	if rawTarget == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing url parameter"})
		return
	}

	targetURL, err := validateImageURL(c.Request.Context(), rawTarget)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate deterministic ETag based on target URL
	hasher := sha256.New()
	hasher.Write([]byte(targetURL.String()))
	etag := fmt.Sprintf(`W/"%s"`, hex.EncodeToString(hasher.Sum(nil))[:16])

	// Check client If-None-Match header for 304 Not Modified
	if clientETag := c.GetHeader("If-None-Match"); clientETag != "" && clientETag == etag {
		c.Header("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable")
		c.Header("CDN-Cache-Control", "public, max-age=31536000, immutable")
		c.Header("Cloudflare-CDN-Cache-Control", "public, max-age=31536000, immutable")
		c.Header("ETag", etag)
		c.Header("X-Source", "MediaGateway-Go")
		c.Status(http.StatusNotModified)
		return
	}

	// Helper to fetch and stream an image upstream
	fetchAndStream := func(imgURL *url.URL) bool {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		defer cancel()

		req, reqErr := http.NewRequestWithContext(ctx, http.MethodGet, imgURL.String(), nil)
		if reqErr != nil {
			return false
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")

		resp, doErr := imageHTTPClient.Do(req)
		if doErr != nil {
			return false
		}
		defer func() {
			_ = resp.Body.Close()
		}()

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			_, _ = io.CopyN(io.Discard, resp.Body, 4*1024)
			return false
		}

		contentType := resp.Header.Get("Content-Type")
		if contentType == "" || !strings.HasPrefix(contentType, "image/") {
			contentType = "image/webp"
		}

		c.Header("Content-Type", contentType)
		c.Header("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable")
		c.Header("CDN-Cache-Control", "public, max-age=31536000, immutable")
		c.Header("Cloudflare-CDN-Cache-Control", "public, max-age=31536000, immutable")
		c.Header("ETag", etag)
		c.Header("X-Source", "MediaGateway-Go")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Status(http.StatusOK)

		// Zero-copy streaming directly to client response writer
		_, _ = io.Copy(c.Writer, resp.Body)
		return true
	}

	// Try primary image target
	if fetchAndStream(targetURL) {
		return
	}

	// If primary failed, check for fallback parameter
	rawFallback := strings.TrimSpace(c.Query("fallback"))
	if rawFallback != "" && rawFallback != rawTarget {
		if fallbackURL, fallbackErr := validateImageURL(c.Request.Context(), rawFallback); fallbackErr == nil {
			if fetchAndStream(fallbackURL) {
				return
			}
		}
	}

	c.JSON(http.StatusBadGateway, gin.H{"error": "Không thể tải hình ảnh từ máy chủ nguồn"})
}
