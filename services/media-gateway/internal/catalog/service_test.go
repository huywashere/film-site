package catalog

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/netphim/media-gateway/internal/config"
)

func TestBootstrapMergesProvidersAndSignsHLSFallback(t *testing.T) {
	var requests atomic.Int64
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		requests.Add(1)
		writer.Header().Set("Content-Type", "application/json")
		switch request.URL.Path {
		case "/film/sample":
			_, _ = writer.Write([]byte(`{"status":true,"movie":{"name":"Phim Mẫu","original_name":"Sample Movie","slug":"sample","year":2024,"episodes":[{"server_name":"NguonC","items":[{"name":"Full","slug":"full","embed":"https://player.example/embed","link_m3u8":"https://media.example/master.m3u8"}]}]}}`))
		case "/info/sample":
			_, _ = writer.Write([]byte(`{"status":"success","data":{"vname":"Phim Mẫu","ename":"Sample Movie","slug":"sample","year":2024,"poster":"https://img.example/poster.jpg","list_episodes":["1|https://vicdn.example/embed"]}}`))
		default:
			_, _ = writer.Write([]byte(`{"status":true,"movie":{"name":"Phim Mẫu","origin_name":"Sample Movie","slug":"sample","year":2024},"episodes":[{"server_name":"Vietsub","server_data":[{"name":"Full","slug":"full","link_m3u8":"https://media.example/master.m3u8"}]}]}`))
		}
	}))
	defer upstream.Close()

	service := New(testConfig(upstream.URL))
	defer service.Close()
	payload, cacheStatus, err := service.Bootstrap(context.Background(), "sample")
	if err != nil {
		t.Fatal(err)
	}
	if cacheStatus != "MISS" {
		t.Fatalf("expected MISS, got %s", cacheStatus)
	}
	providers, ok := payload["_providers"].(map[string]any)
	if !ok || len(providers) < 4 {
		t.Fatalf("expected merged providers, got %#v", payload["_providers"])
	}
	nguonc := providers["nguonc"].(map[string]any)
	episodes := nguonc["episodes"].([]any)
	server := episodes[0].(map[string]any)
	episode := server["server_data"].([]any)[0].(map[string]any)
	if proxy := fmt.Sprint(episode["link_m3u8_proxy"]); proxy == "" || proxy == "<nil>" {
		t.Fatalf("expected signed HLS fallback, got %#v", episode)
	}

	before := requests.Load()
	_, cacheStatus, err = service.Bootstrap(context.Background(), "sample")
	if err != nil || cacheStatus != "HIT" {
		t.Fatalf("expected cached bootstrap, status=%s err=%v", cacheStatus, err)
	}
	if requests.Load() != before {
		t.Fatal("cached bootstrap unexpectedly called upstream")
	}
}

func TestCatalogAndSearchDedupeSources(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		if request.URL.Path == "/update/1" {
			_, _ = writer.Write([]byte(`{"status":"success","data":[{"vname":"Phim Mẫu","ename":"Sample Movie","slug":"sample","year":2024}]}`))
			return
		}
		_, _ = writer.Write([]byte(`{"status":true,"items":[{"name":"Phim Mẫu","origin_name":"Sample Movie","slug":"sample","year":2024},{"name":"Phim Khác","origin_name":"Other Movie","slug":"other","year":2023}],"data":{"items":[{"name":"Phim Mẫu","origin_name":"Sample Movie","slug":"sample","year":2024},{"name":"Phim Khác","origin_name":"Other Movie","slug":"other","year":2023}]}}`))
	}))
	defer upstream.Close()
	service := New(testConfig(upstream.URL))
	defer service.Close()

	catalogPayload, _, err := service.Catalog(context.Background(), "latest", "", 1, 24)
	if err != nil {
		t.Fatal(err)
	}
	items := catalogPayload["items"].([]any)
	if len(items) != 2 {
		t.Fatalf("expected two deduped films, got %d", len(items))
	}
	first := items[0].(map[string]any)
	if numberValue(first["_duplicateCount"]) < 3 {
		t.Fatalf("expected source alternatives to be retained: %#v", first)
	}

	searchPayload, _, err := service.Search(context.Background(), "Phim Mẫu", 1, 10)
	if err != nil {
		t.Fatal(err)
	}
	data := searchPayload["data"].(map[string]any)
	searchItems := data["items"].([]any)
	if len(searchItems) == 0 || searchItems[0].(map[string]any)["slug"] != "sample" {
		t.Fatalf("expected exact result first: %#v", searchItems)
	}
}

func TestTop10PrefersAnalyticsAPI(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		if request.URL.Path == "/movies/trending" {
			_ = json.NewEncoder(writer).Encode([]map[string]any{{"slug": "real-view-leader", "views": 9000}})
			return
		}
		writer.WriteHeader(http.StatusNotFound)
	}))
	defer upstream.Close()
	cfg := testConfig(upstream.URL)
	cfg.CoreAPIURL = upstream.URL
	service := New(cfg)
	defer service.Close()

	items, status, err := service.Top10(context.Background(), 10)
	if err != nil {
		t.Fatal(err)
	}
	if status != "MISS-ANALYTICS" || len(items) != 1 {
		t.Fatalf("expected analytics top10, status=%s items=%#v", status, items)
	}
}

func TestSearchDoesNotPaginateProviderPageTwice(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		if request.URL.Query().Get("page") != "2" {
			t.Fatalf("expected upstream page 2, got %q", request.URL.Query().Get("page"))
		}
		_, _ = writer.Write([]byte(`{"status":true,"data":{"items":[{"name":"Phim Trang Hai","origin_name":"Second Page Movie","slug":"second-page","year":2025}],"params":{"pagination":{"totalItems":21,"totalPages":3}}}}`))
	}))
	defer upstream.Close()

	service := New(testConfig(upstream.URL))
	defer service.Close()
	payload, _, err := service.Search(context.Background(), "Phim Trang Hai", 2, 10)
	if err != nil {
		t.Fatal(err)
	}
	data := payload["data"].(map[string]any)
	items := data["items"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["slug"] != "second-page" {
		t.Fatalf("provider page was paginated twice: %#v", items)
	}
	pagination := data["params"].(map[string]any)["pagination"].(map[string]any)
	if numberValue(pagination["totalPages"]) != 3 {
		t.Fatalf("expected upstream pagination to be retained: %#v", pagination)
	}
}

func TestSearchAcceptsEmptyProviderResults(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"status":true,"data":{"items":[],"params":{"pagination":{"totalItems":0,"totalPages":1}}}}`))
	}))
	defer upstream.Close()

	service := New(testConfig(upstream.URL))
	defer service.Close()
	payload, _, err := service.Search(context.Background(), "khong co ket qua", 1, 10)
	if err != nil {
		t.Fatalf("empty search is a valid response: %v", err)
	}
	items := payload["data"].(map[string]any)["items"].([]any)
	if len(items) != 0 {
		t.Fatalf("expected empty result, got %#v", items)
	}
}

func TestSearchFiltersAndMergesTranslatedDuplicates(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"status":true,"data":{"items":[{"name":"Bố Già","origin_name":"The Godfather","slug":"the-godfather","year":1972,"type":"single","category":[{"name":"Chiến Tranh","slug":"chien-tranh"}],"country":[{"name":"Anh","slug":"anh"}]},{"name":"Bố Già","slug":"bo-gia-1972","year":1972,"type":"single","category":[{"slug":"chien-tranh"}],"country":[{"slug":"anh"}]},{"name":"Bố Già","origin_name":"Dad, I'm Sorry","slug":"bo-gia-viet-nam","year":2021,"type":"single","category":[{"slug":"gia-dinh"}],"country":[{"slug":"viet-nam"}]}]}}`))
	}))
	defer upstream.Close()

	service := New(testConfig(upstream.URL))
	defer service.Close()
	payload, _, err := service.SearchFiltered(context.Background(), "Bố Già", 1, 24, SearchFilters{
		Type: "single", Genre: "chien-tranh", Country: "anh", Year: 1972,
	})
	if err != nil {
		t.Fatal(err)
	}
	items := payload["data"].(map[string]any)["items"].([]any)
	if len(items) != 1 {
		t.Fatalf("expected one filtered, deduplicated film, got %#v", items)
	}
	film := items[0].(map[string]any)
	if film["origin_name"] != "The Godfather" {
		t.Fatalf("expected the richer provider metadata to survive: %#v", film)
	}
}

func testConfig(origin string) config.Config {
	return config.Config{
		SigningSecret:    "test-signing-secret-that-is-at-least-32-characters",
		RedisURL:         "",
		CatalogTimeout:   2 * time.Second,
		CatalogCacheTTL:  10 * time.Minute,
		CatalogSearchTTL: 5 * time.Minute,
		CatalogListTTL:   2 * time.Minute,
		CatalogMaxBytes:  1024 * 1024,
		CoreAPIURL:       "",
		KKPhimOrigins:    []string{origin},
		OPhimOrigins:     []string{origin},
		NguonCOrigins:    []string{origin},
		VSMovOrigins:     []string{origin},
		ViCDNOrigins:     []string{origin},
	}
}
