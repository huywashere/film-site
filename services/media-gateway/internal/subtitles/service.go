package subtitles

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	maxSubtitleBytes = 5 * 1024 * 1024 // 5 MB
	subtitleTimeout  = 6 * time.Second
)

type cachedSubtitle struct {
	content string
	expiry  time.Time
}

// Service manages fetching, decrypting, and parsing subtitles.
type Service struct {
	httpClient *http.Client
	cacheMutex sync.RWMutex
	cache      map[string]cachedSubtitle
}

// NewService initializes a new subtitles service.
func NewService() *Service {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   subtitleTimeout,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
	}

	return &Service{
		httpClient: &http.Client{
			Transport: transport,
			Timeout:   subtitleTimeout,
		},
		cache: make(map[string]cachedSubtitle),
	}
}

func isPrivateIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsPrivate() {
		return true
	}
	return false
}

func (s *Service) isSafeHost(host string) bool {
	hostname := host
	if h, _, err := net.SplitHostPort(host); err == nil {
		hostname = h
	}
	if hostname == "localhost" || hostname == "127.0.0.1" || hostname == "::1" {
		return false
	}
	ips, err := net.LookupIP(hostname)
	if err != nil || len(ips) == 0 {
		return false
	}
	for _, ip := range ips {
		if isPrivateIP(ip) {
			return false
		}
	}
	return true
}

func (s *Service) fetchSubtitle(ctx context.Context, targetURL string) (string, error) {
	parsed, err := url.Parse(targetURL)
	if err != nil {
		return "", errors.New("invalid subtitle URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", errors.New("unsupported protocol scheme")
	}
	if !s.isSafeHost(parsed.Host) {
		return "", errors.New("private host access forbidden")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/vtt,text/plain,*/*")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("upstream returned %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, maxSubtitleBytes+1))
	if err != nil {
		return "", err
	}
	if len(bodyBytes) > maxSubtitleBytes {
		return "", errors.New("subtitle file exceeds maximum size limit")
	}

	raw := string(bodyBytes)
	return DecryptSubtitle(raw, HubphimDefaultKey), nil
}

// HandleGetSubtitles handles /v1/subtitles and /api/subtitles.
func (s *Service) HandleGetSubtitles(c *gin.Context) {
	url1 := strings.TrimSpace(c.Query("url"))
	if url1 == "" {
		url1 = strings.TrimSpace(c.Query("url1"))
	}
	id1 := strings.TrimSpace(c.Query("id"))
	if id1 == "" {
		id1 = strings.TrimSpace(c.Query("id1"))
	}
	url2 := strings.TrimSpace(c.Query("url2"))
	id2 := strings.TrimSpace(c.Query("id2"))
	mode := strings.ToLower(strings.TrimSpace(c.Query("mode")))

	target1 := url1
	if target1 == "" && id1 != "" {
		target1 = "https://tophim.top/api/subtitles/play?id=" + url.QueryEscape(id1)
	}
	if target1 == "" {
		c.String(http.StatusBadRequest, "Thiếu tham số url hoặc id phụ đề")
		return
	}

	target2 := url2
	if target2 == "" && id2 != "" {
		target2 = "https://tophim.top/api/subtitles/play?id=" + url.QueryEscape(id2)
	}

	cacheKey := fmt.Sprintf("sub:%s:%s:%s", target1, target2, mode)

	// Check in-memory cache
	s.cacheMutex.RLock()
	cached, ok := s.cache[cacheKey]
	s.cacheMutex.RUnlock()
	if ok && time.Now().Before(cached.expiry) {
		setSubtitleHeaders(c)
		c.Header("X-Cache", "HIT-GO-SUBTITLES")
		c.String(http.StatusOK, cached.content)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	text1, err := s.fetchSubtitle(ctx, target1)
	if err != nil {
		c.String(http.StatusBadGateway, "Lỗi tải phụ đề: "+err.Error())
		return
	}

	finalVTT := text1
	if mode == "dual" && target2 != "" {
		text2, err := s.fetchSubtitle(ctx, target2)
		if err == nil {
			cues1 := ParseSubtitleCues(text1)
			cues2 := ParseSubtitleCues(text2)
			merged := MergeDualSubtitleCues(cues1, cues2)
			finalVTT = BuildWebVttString(merged)
		}
	} else if !strings.HasPrefix(strings.TrimSpace(finalVTT), "WEBVTT") {
		// Ensure standard WebVTT formatting if input was SRT
		cues := ParseSubtitleCues(finalVTT)
		if len(cues) > 0 {
			finalVTT = BuildWebVttString(cues)
		}
	}

	// Cache result for 24 hours
	s.cacheMutex.Lock()
	s.cache[cacheKey] = cachedSubtitle{
		content: finalVTT,
		expiry:  time.Now().Add(24 * time.Hour),
	}
	// Bound cache size
	if len(s.cache) > 2000 {
		now := time.Now()
		for k, v := range s.cache {
			if now.After(v.expiry) {
				delete(s.cache, k)
			}
		}
	}
	s.cacheMutex.Unlock()

	setSubtitleHeaders(c)
	c.Header("X-Cache", "MISS-GO-SUBTITLES")
	c.String(http.StatusOK, finalVTT)
}

func setSubtitleHeaders(c *gin.Context) {
	c.Header("Content-Type", "text/vtt; charset=utf-8")
	c.Header("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("X-Source", "Go-Subtitles-Engine")
	c.Header("Content-Length", strconv.Itoa(len(c.Writer.Header().Get("Content-Length"))))
}

