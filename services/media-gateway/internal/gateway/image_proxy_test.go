package gateway

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/netphim/media-gateway/internal/config"
	"github.com/netphim/media-gateway/internal/store"
)

func TestImageProxyRejectsDisallowedHosts(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Config{
		SigningSecret:  "12345678901234567890123456789012",
		Environment:    "test",
		RequestTimeout: 2 * time.Second,
		RatePerSecond:  100,
		RateBurst:      200,
	}
	gw := New(cfg, store.NewMemoryManifestStore(time.Minute))
	router := gin.New()
	gw.Register(router)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/image-proxy?url=https://evil-site.com/avatar.jpg", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for disallowed host, got %d", w.Code)
	}
}

func TestImageProxyStreamsValidImage(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Mock upstream image server
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/webp")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("fake-image-bytes"))
	}))
	defer upstream.Close()

	cfg := config.Config{
		SigningSecret:  "12345678901234567890123456789012",
		Environment:    "test",
		RequestTimeout: 2 * time.Second,
		RatePerSecond:  100,
		RateBurst:      200,
	}
	gw := New(cfg, store.NewMemoryManifestStore(time.Minute))
	router := gin.New()
	gw.Register(router)

	// Temporarily allow the test upstream host
	defaultAllowedImageHosts = append(defaultAllowedImageHosts, "127.0.0.1")

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/image-proxy?url="+upstream.URL+"/test.webp", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if w.Header().Get("X-Source") != "MediaGateway-Go" {
		t.Fatalf("missing X-Source header: %s", w.Header().Get("X-Source"))
	}
	if w.Header().Get("Cache-Control") == "" {
		t.Fatal("missing Cache-Control header")
	}
	if w.Body.String() != "fake-image-bytes" {
		t.Fatalf("unexpected body: %s", w.Body.String())
	}
}
