package catalog

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/netphim/media-gateway/internal/config"
)

func TestProviderProxyHedgedRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Origin 1: slow/hanging origin (takes 1s)
	origin1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(1 * time.Second)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"source": "origin1"})
	}))
	defer origin1.Close()

	// Origin 2: fast origin (returns instantly)
	origin2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"status": "success", "movies": []any{}})
	}))
	defer origin2.Close()

	cfg := config.Config{
		Environment:     "test",
		KKPhimOrigins:   []string{origin1.URL, origin2.URL},
		RequestTimeout:  3 * time.Second,
		CatalogTimeout:  5 * time.Second,
		CatalogMaxBytes: 10 * 1024 * 1024,
	}

	svc := New(cfg)
	defer svc.Close()

	router := gin.New()
	svc.Register(router)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/v1/proxy/kkphim/danh-sach/phim-moi-cap-nhat?page=1", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if w.Header().Get("X-Source") != "MediaGateway-Go" {
		t.Fatalf("missing X-Source header: %s", w.Header().Get("X-Source"))
	}
	if w.Header().Get("X-NetPhim-Cache") != "MISS" {
		t.Fatalf("expected MISS on first load, got %s", w.Header().Get("X-NetPhim-Cache"))
	}

	// Second request should be a fast cache HIT
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/v1/proxy/kkphim/danh-sach/phim-moi-cap-nhat?page=1", nil)
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 on cache hit, got %d", w2.Code)
	}
	if w2.Header().Get("X-NetPhim-Cache") != "HIT" {
		t.Fatalf("expected HIT on second load, got %s", w2.Header().Get("X-NetPhim-Cache"))
	}
}
