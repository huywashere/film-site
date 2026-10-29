package crawler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type Engine struct {
	client     *http.Client
	jobs       map[string]*CrawlJob
	jobsMu     sync.RWMutex
	numWorkers int
}

func NewEngine(workers int) *Engine {
	if workers <= 0 {
		workers = 12
	}
	return &Engine{
		client: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				ForceAttemptHTTP2:   true,
				MaxIdleConns:        128,
				MaxIdleConnsPerHost: 24,
				IdleConnTimeout:     90 * time.Second,
				TLSHandshakeTimeout: 6 * time.Second,
			},
		},
		jobs:       make(map[string]*CrawlJob),
		numWorkers: workers,
	}
}

func randomID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func extractSlug(input string) string {
	trimmed := strings.TrimSpace(input)
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		parsed, err := url.Parse(trimmed)
		if err == nil {
			parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
			if len(parts) > 0 {
				return parts[len(parts)-1]
			}
		}
	}
	return strings.Trim(trimmed, "/")
}

func (e *Engine) getProviderBaseURL(provider string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "kkphim":
		return "https://phimapi.com", nil
	case "nguonc":
		return "https://phim.nguonc.com/api", nil
	case "vsmov":
		return "https://vsmov.com/api", nil
	default:
		return "", fmt.Errorf("nhà cung cấp không được hỗ trợ: %s (chỉ hỗ trợ kkphim, nguonc, vsmov)", provider)
	}
}

func (e *Engine) CrawlSingle(ctx context.Context, provider string, slugOrUrl string) (*MovieItem, error) {
	slug := extractSlug(slugOrUrl)
	if slug == "" {
		return nil, fmt.Errorf("slug hoặc URL không hợp lệ")
	}

	baseURL, err := e.getProviderBaseURL(provider)
	if err != nil {
		return nil, err
	}

	var targetURL string
	switch strings.ToLower(provider) {
	case "nguonc":
		targetURL = fmt.Sprintf("%s/film/%s", baseURL, slug)
	default:
		targetURL = fmt.Sprintf("%s/phim/%s", baseURL, slug)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "FlexPhim-Crawler-Go/2.0")
	req.Header.Set("Accept", "application/json")
	if strings.ToLower(provider) == "nguonc" {
		req.Header.Set("Referer", "https://phim.nguonc.com/")
	}

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("kết nối upstream thất bại: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream trả về mã lỗi %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("lỗi đọc nội dung phản hồi: %w", err)
	}

	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("dữ liệu JSON không hợp lệ: %w", err)
	}

	return e.normalizeMoviePayload(provider, slug, raw)
}

func (e *Engine) normalizeMoviePayload(provider, fallbackSlug string, raw map[string]any) (*MovieItem, error) {
	var movie map[string]any
	var episodes []any

	if m, ok := raw["movie"].(map[string]any); ok {
		movie = m
	} else if item, ok := raw["item"].(map[string]any); ok {
		movie = item
	} else {
		movie = raw
	}

	if eps, ok := raw["episodes"].([]any); ok {
		episodes = eps
	} else if eps, ok := movie["episodes"].([]any); ok {
		episodes = eps
	}

	name := getString(movie, "name", "title")
	if name == "" {
		name = fallbackSlug
	}

	slug := getString(movie, "slug")
	if slug == "" {
		slug = fallbackSlug
	}

	year, _ := strconv.Atoi(fmt.Sprintf("%v", movie["year"]))
	if year <= 0 {
		year = time.Now().Year()
	}

	item := &MovieItem{
		Name:           name,
		Slug:           slug,
		OriginName:     getString(movie, "origin_name", "original_name", "originTitle"),
		Type:           getString(movie, "type"),
		Year:           year,
		Quality:        getString(movie, "quality"),
		Lang:           getString(movie, "lang", "language"),
		PosterURL:      getString(movie, "poster_url", "thumb_url"),
		ThumbURL:       getString(movie, "thumb_url", "poster_url"),
		Time:           getString(movie, "time"),
		EpisodeTotal:   getString(movie, "episode_total"),
		EpisodeCurrent: getString(movie, "episode_current"),
		Content:        getString(movie, "content", "description"),
		TrailerURL:     getString(movie, "trailer_url"),
		Episodes:       episodes,
		Source:         provider,
		UpdatedAt:      time.Now().UTC().Format(time.RFC3339),
	}

	return item, nil
}

func getString(m map[string]any, keys ...string) string {
	for _, key := range keys {
		if val, ok := m[key]; ok && val != nil {
			str := strings.TrimSpace(fmt.Sprintf("%v", val))
			if str != "" && str != "<nil>" {
				return str
			}
		}
	}
	return ""
}

func (e *Engine) StartBatch(opts BatchCrawlOptions) (*CrawlJob, error) {
	baseURL, err := e.getProviderBaseURL(opts.Provider)
	if err != nil {
		return nil, err
	}

	if opts.FromPage <= 0 {
		opts.FromPage = 1
	}
	if opts.ToPage <= 0 || opts.ToPage < opts.FromPage {
		opts.ToPage = opts.FromPage
	}
	if opts.DelayMs <= 0 {
		opts.DelayMs = 150
	}

	totalPages := opts.ToPage - opts.FromPage + 1
	ctx, cancel := context.WithCancel(context.Background())

	job := &CrawlJob{
		ID:         randomID(),
		Provider:   strings.ToLower(opts.Provider),
		FromPage:   opts.FromPage,
		ToPage:     opts.ToPage,
		TotalPages: totalPages,
		Status:     "running",
		StartedAt:  time.Now().UTC(),
		CancelFunc: cancel,
	}

	e.jobsMu.Lock()
	e.jobs[job.ID] = job
	e.jobsMu.Unlock()

	go e.runBatchJob(ctx, job, baseURL, opts.DelayMs)

	return job, nil
}

func (e *Engine) runBatchJob(ctx context.Context, job *CrawlJob, baseURL string, delayMs int) {
	defer func() {
		now := time.Now().UTC()
		job.Mu.Lock()
		job.FinishedAt = &now
		if job.Status == "running" {
			job.Status = "completed"
		}
		job.Mu.Unlock()
	}()

	pageChan := make(chan int, job.TotalPages)
	for p := job.FromPage; p <= job.ToPage; p++ {
		pageChan <- p
	}
	close(pageChan)

	var wg sync.WaitGroup
	workers := e.numWorkers
	if workers > job.TotalPages {
		workers = job.TotalPages
	}

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					job.Mu.Lock()
					job.Status = "cancelled"
					job.Mu.Unlock()
					return
				case page, ok := <-pageChan:
					if !ok {
						return
					}
					e.crawlPage(ctx, job, baseURL, page)
					if delayMs > 0 {
						time.Sleep(time.Duration(delayMs) * time.Millisecond)
					}
				}
			}
		}()
	}

	wg.Wait()
}

func (e *Engine) crawlPage(ctx context.Context, job *CrawlJob, baseURL string, page int) {
	var pageURL string
	if job.Provider == "nguonc" {
		pageURL = fmt.Sprintf("%s/films/phim-moi-cap-nhat?page=%d", baseURL, page)
	} else {
		pageURL = fmt.Sprintf("%s/danh-sach/phim-moi-cap-nhat?page=%d", baseURL, page)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pageURL, nil)
	if err != nil {
		job.Mu.Lock()
		job.FailedCount++
		job.ProcessedPages++
		job.Mu.Unlock()
		return
	}
	req.Header.Set("User-Agent", "FlexPhim-Crawler-Go/2.0")
	req.Header.Set("Accept", "application/json")

	resp, err := e.client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			_ = resp.Body.Close()
		}
		job.Mu.Lock()
		job.FailedCount++
		job.ProcessedPages++
		job.Mu.Unlock()
		return
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 4*1024*1024))
	if err != nil {
		job.Mu.Lock()
		job.FailedCount++
		job.ProcessedPages++
		job.Mu.Unlock()
		return
	}

	var parsed map[string]any
	if err := json.Unmarshal(body, &parsed); err != nil {
		job.Mu.Lock()
		job.FailedCount++
		job.ProcessedPages++
		job.Mu.Unlock()
		return
	}

	var items []any
	if data, ok := parsed["data"].(map[string]any); ok {
		if it, ok := data["items"].([]any); ok {
			items = it
		}
	} else if it, ok := parsed["items"].([]any); ok {
		items = it
	}

	job.Mu.Lock()
	job.ProcessedPages++
	job.TotalMovies += len(items)
	job.SuccessCount += len(items)
	job.Mu.Unlock()
}

func (e *Engine) GetJob(id string) *CrawlJob {
	e.jobsMu.RLock()
	defer e.jobsMu.RUnlock()
	return e.jobs[id]
}

func (e *Engine) GetJobs() []map[string]any {
	e.jobsMu.RLock()
	defer e.jobsMu.RUnlock()

	result := make([]map[string]any, 0, len(e.jobs))
	for _, job := range e.jobs {
		result = append(result, job.Snapshot())
	}
	return result
}

func (e *Engine) CancelJob(id string) bool {
	e.jobsMu.RLock()
	job, ok := e.jobs[id]
	e.jobsMu.RUnlock()

	if !ok || job == nil {
		return false
	}

	job.Mu.Lock()
	defer job.Mu.Unlock()

	if job.Status == "running" {
		job.Status = "cancelled"
		if job.CancelFunc != nil {
			job.CancelFunc()
		}
		return true
	}
	return false
}

func (e *Engine) RegisterRoutes(router *gin.Engine) {
	group := router.Group("/v1/crawler")

	group.POST("/single", func(c *gin.Context) {
		var input struct {
			Provider  string `json:"provider" binding:"required"`
			SlugOrURL string `json:"slugOrUrl" binding:"required"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu tham số provider hoặc slugOrUrl"})
			return
		}

		item, err := e.CrawlSingle(c.Request.Context(), input.Provider, input.SlugOrURL)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": true, "movie": item})
	})

	group.POST("/batch", func(c *gin.Context) {
		var opts BatchCrawlOptions
		if err := c.ShouldBindJSON(&opts); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cấu hình batch crawl không hợp lệ"})
			return
		}

		job, err := e.StartBatch(opts)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": true, "job": job.Snapshot()})
	})

	group.GET("/jobs", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"jobs": e.GetJobs()})
	})

	group.GET("/jobs/:id", func(c *gin.Context) {
		job := e.GetJob(c.Param("id"))
		if job == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy tiến trình crawl"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"job": job.Snapshot()})
	})

	group.POST("/jobs/:id/cancel", func(c *gin.Context) {
		ok := e.CancelJob(c.Param("id"))
		c.JSON(http.StatusOK, gin.H{"status": ok})
	})
}

