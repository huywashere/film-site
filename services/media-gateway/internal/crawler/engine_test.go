package crawler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestCrawlerSingleMovie(t *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": true,
			"movie": map[string]any{
				"name":        "Người Nhện",
				"slug":        "nguoi-nhen",
				"origin_name": "Spider-Man",
				"year":        2002,
				"quality":     "HD",
				"poster_url":  "spiderman.jpg",
			},
		})
	}))
	defer mockServer.Close()

	engine := NewEngine(4)
	// Inject mock client or test direct normalization
	raw := map[string]any{
		"movie": map[string]any{
			"name":        "Người Nhện",
			"slug":        "nguoi-nhen",
			"origin_name": "Spider-Man",
			"year":        2002,
			"quality":     "HD",
			"poster_url":  "spiderman.jpg",
		},
	}

	doc, err := engine.normalizeMoviePayload("kkphim", "nguoi-nhen", raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if doc.Name != "Người Nhện" {
		t.Fatalf("expected name Người Nhện, got %s", doc.Name)
	}
	if doc.Year != 2002 {
		t.Fatalf("expected year 2002, got %d", doc.Year)
	}
}

func TestCrawlerBatchJobTracking(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": true,
			"data": map[string]any{
				"items": []any{
					map[string]any{"name": "Phim 1", "slug": "phim-1"},
					map[string]any{"name": "Phim 2", "slug": "phim-2"},
				},
			},
		})
	}))
	defer mockServer.Close()

	engine := NewEngine(2)
	job := &CrawlJob{
		ID:         "test-job-1",
		Provider:   "kkphim",
		FromPage:   1,
		ToPage:     2,
		TotalPages: 2,
		Status:     "running",
		StartedAt:  time.Now().UTC(),
	}
	engine.jobs[job.ID] = job

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	engine.crawlPage(ctx, job, mockServer.URL, 1)

	if job.ProcessedPages != 1 {
		t.Fatalf("expected processedPages 1, got %d", job.ProcessedPages)
	}
	if job.TotalMovies != 2 {
		t.Fatalf("expected totalMovies 2, got %d", job.TotalMovies)
	}

	snap := job.Snapshot()
	if snap["status"] != "running" {
		t.Fatalf("expected status running, got %v", snap["status"])
	}
}

