package catalog

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/netphim/media-gateway/internal/config"
)

func newArtworkTestService(serverURL string) *Service {
	return &Service{
		cfg: config.Config{
			TMDBAccessToken:        "test-token",
			TMDBBaseURL:            serverURL,
			TMDBArtworkTTL:         30 * 24 * time.Hour,
			TMDBArtworkMissTTL:     7 * 24 * time.Hour,
			TMDBArtworkTimeout:     time.Second,
			TMDBArtworkConcurrency: 4,
		},
		cache:      NewMemoryCache(50),
		tmdbClient: &http.Client{Timeout: time.Second},
		tmdbSlots:  make(chan struct{}, 4),
	}
}

func TestEnrichMoviesEmbedsResponsiveTMDBArtworkAndCachesIt(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		requests.Add(1)
		if request.URL.Path != "/tv/1399" {
			t.Fatalf("unexpected TMDB path: %s", request.URL.Path)
		}
		if request.Header.Get("Authorization") != "Bearer test-token" {
			t.Fatal("missing TMDB bearer token")
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{
			"id":1399,
			"poster_path":"/poster.jpg",
			"backdrop_path":"/backdrop.jpg",
			"images":{"logos":[
				{"file_path":"/english.png","iso_639_1":"en","width":900,"vote_average":9},
				{"file_path":"/vietnamese.png","iso_639_1":"vi","width":700,"vote_average":8}
			]}
		}`))
	}))
	defer server.Close()

	service := newArtworkTestService(server.URL)
	movie := map[string]any{
		"slug": "game-of-thrones", "name": "Trò Chơi Vương Quyền",
		"poster_url": "https://provider.test/poster.jpg",
		"thumb_url":  "https://provider.test/backdrop.jpg",
		"tmdb":       map[string]any{"id": 1399, "type": "tv"},
	}
	service.enrichMovies(context.Background(), []map[string]any{movie})

	artwork, ok := movie["artwork"].(map[string]any)
	if !ok {
		t.Fatal("expected embedded artwork payload")
	}
	poster := artwork["poster"].(map[string]any)
	if poster["w342"] != "https://image.tmdb.org/t/p/w342/poster.jpg" || poster["w500"] != "https://image.tmdb.org/t/p/w500/poster.jpg" {
		t.Fatalf("unexpected responsive poster payload: %#v", poster)
	}
	backdrop := artwork["backdrop"].(map[string]any)
	if backdrop["w1280"] != "https://image.tmdb.org/t/p/w1280/backdrop.jpg" {
		t.Fatalf("unexpected backdrop payload: %#v", backdrop)
	}
	if movie["titleLogo"] != "https://image.tmdb.org/t/p/w500/vietnamese.png" {
		t.Fatalf("expected Vietnamese title logo, got %#v", movie["titleLogo"])
	}

	second := map[string]any{"slug": "got-copy", "tmdb": map[string]any{"id": 1399, "type": "tv"}}
	service.enrichMovies(context.Background(), []map[string]any{second})
	if requests.Load() != 1 {
		t.Fatalf("expected cached TMDB metadata, got %d requests", requests.Load())
	}
}

func TestTMDBArtworkMissIsCached(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		requests.Add(1)
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"results":[]}`))
	}))
	defer server.Close()

	service := newArtworkTestService(server.URL)
	movie := map[string]any{"slug": "unknown", "name": "A Movie TMDB Does Not Have", "year": 2026}
	if record, err := service.resolveTMDBArtwork(context.Background(), movie); err == nil || record != nil {
		t.Fatal("expected first lookup to cache a miss")
	}
	if record, err := service.resolveTMDBArtwork(context.Background(), movie); err == nil || record != nil {
		t.Fatal("expected cached miss on second lookup")
	}
	if requests.Load() != 1 {
		t.Fatalf("expected one TMDB search request after cached miss, got %d", requests.Load())
	}
}
