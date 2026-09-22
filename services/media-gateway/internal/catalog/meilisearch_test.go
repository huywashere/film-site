package catalog

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/netphim/media-gateway/internal/config"
)

func TestMeiliDocumentKeepsSourceFallbackMetadata(t *testing.T) {
	movie := map[string]any{
		"name": "Bố Già", "origin_name": "The Godfather", "slug": "bo-gia", "year": 1972,
		"type": "single", "category": []any{map[string]any{"name": "Chính kịch", "slug": "chinh-kich"}},
		"_canonicalKey": "the godfather:1972", "_sources": []string{"kkphim", "ophim"},
		"_sourceSlugs": map[string]any{"kkphim": "bo-gia", "ophim": "the-godfather"},
	}
	document := meiliDocument(movie)
	if document["search_id"] == "" || document["search_type"] != "single" {
		t.Fatalf("invalid search document: %#v", document)
	}
	if document["_sourceSlugs"] == nil || document["_sources"] == nil {
		t.Fatalf("source fallback metadata was lost: %#v", document)
	}
	normalizedAliases, ok := document["search_aliases_normalized"].([]string)
	if !ok || !containsString(normalizedAliases, "bo gia") || !containsString(normalizedAliases, "the godfather") {
		t.Fatalf("Vietnamese and original aliases must be searchable: %#v", normalizedAliases)
	}
	if quality := document["search_quality"]; quality != 3 {
		t.Fatalf("source quality score should reward two fallback sources, got %#v", quality)
	}
	second := meiliDocument(movie)
	if document["search_id"] != second["search_id"] {
		t.Fatal("the same canonical movie must always receive the same search id")
	}
}

func TestMeiliDeleteCanonicalQueuesStableDocumentID(t *testing.T) {
	deleteBodies := make(chan map[string]any, 1)
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch {
		case request.Method == http.MethodPost && request.URL.Path == "/indexes":
			writer.WriteHeader(http.StatusAccepted)
		case request.Method == http.MethodPatch && strings.HasSuffix(request.URL.Path, "/settings"):
			writer.WriteHeader(http.StatusAccepted)
		case request.Method == http.MethodPost && strings.HasSuffix(request.URL.Path, "/documents/delete"):
			var deleteBody map[string]any
			if err := json.NewDecoder(request.Body).Decode(&deleteBody); err != nil {
				t.Fatal(err)
			}
			deleteBodies <- deleteBody
			writer.WriteHeader(http.StatusAccepted)
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	index := newMeiliSearchIndex(config.Config{
		MeiliURL: server.URL, MeiliIndex: "movies", MeiliTimeout: time.Second, MeiliBatchSize: 1,
	})
	defer index.Close()
	index.DeleteCanonical([]string{"the godfather:1972"})

	var deleteBody map[string]any
	select {
	case deleteBody = <-deleteBodies:
	case <-time.After(time.Second):
		t.Fatal("delete mutation was not flushed")
	}
	digest := sha256.Sum256([]byte("the godfather:1972"))
	expectedID := hex.EncodeToString(digest[:])
	filter, _ := deleteBody["filter"].(string)
	if !strings.Contains(filter, expectedID) {
		t.Fatalf("delete filter does not contain stable document id: %q", filter)
	}
	deadline := time.Now().Add(time.Second)
	for index.deleted.Load() != 1 && time.Now().Before(deadline) {
		time.Sleep(5 * time.Millisecond)
	}
	if index.deleted.Load() != 1 {
		t.Fatalf("expected one deleted document, got %d", index.deleted.Load())
	}
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func TestMeiliSearchUsesPrivateKeyAndFilters(t *testing.T) {
	var searchBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Header.Get("Authorization") != "Bearer private-key" {
			writer.WriteHeader(http.StatusUnauthorized)
			return
		}
		switch {
		case request.Method == http.MethodPost && request.URL.Path == "/indexes":
			writer.WriteHeader(http.StatusAccepted)
		case request.Method == http.MethodPatch && strings.HasSuffix(request.URL.Path, "/settings"):
			writer.WriteHeader(http.StatusAccepted)
		case request.Method == http.MethodPost && strings.HasSuffix(request.URL.Path, "/search"):
			if err := json.NewDecoder(request.Body).Decode(&searchBody); err != nil {
				t.Fatal(err)
			}
			writer.Header().Set("Content-Type", "application/json")
			_, _ = writer.Write([]byte(`{"hits":[{"search_id":"internal","name":"Bố Già","slug":"bo-gia","year":1972,"_sources":["kkphim","ophim"],"_sourceSlugs":{"kkphim":"bo-gia"}}],"estimatedTotalHits":1,"processingTimeMs":2}`))
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	index := newMeiliSearchIndex(config.Config{
		MeiliURL: server.URL, MeiliAPIKey: "private-key", MeiliIndex: "movies",
		MeiliTimeout: time.Second, MeiliBatchSize: 20,
	})
	defer index.Close()
	response, err := index.Search(context.Background(), "bo gia", 1, 12, SearchFilters{Type: "single", Year: 1972})
	if err != nil {
		t.Fatal(err)
	}
	if len(response.Hits) != 1 || response.Hits[0]["search_id"] != nil || response.Hits[0]["_sourceSlugs"] == nil {
		t.Fatalf("unexpected sanitized response: %#v", response.Hits)
	}
	filters, ok := searchBody["filter"].([]any)
	if !ok || len(filters) != 2 {
		t.Fatalf("expected type and year filters, got %#v", searchBody["filter"])
	}
}

func TestMeiliFailureOpensCircuitForImmediateProviderFallback(t *testing.T) {
	var requests atomic.Int64
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		requests.Add(1)
		writer.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()
	index := newMeiliSearchIndex(config.Config{
		MeiliURL: server.URL, MeiliIndex: "movies", MeiliTimeout: time.Second, MeiliBatchSize: 20,
	})
	defer index.Close()

	_, firstErr := index.Search(context.Background(), "test", 1, 10, SearchFilters{})
	before := requests.Load()
	started := time.Now()
	_, secondErr := index.Search(context.Background(), "test", 1, 10, SearchFilters{})
	if firstErr == nil || secondErr == nil {
		t.Fatal("failed Meilisearch calls must fall back")
	}
	if requests.Load() != before || time.Since(started) > 50*time.Millisecond {
		t.Fatalf("open circuit should avoid another network call: before=%d after=%d elapsed=%s", before, requests.Load(), time.Since(started))
	}
}

func TestMeiliSnapshotUpsertsAndPrunesOnlyMissingDocuments(t *testing.T) {
	canonical := "film:single:the godfather:1972"
	keepDigest := sha256.Sum256([]byte(canonical))
	keepID := hex.EncodeToString(keepDigest[:])
	staleID := strings.Repeat("a", 64)
	var deletedFilter string
	var upserted []map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch {
		case request.Method == http.MethodPost && request.URL.Path == "/indexes":
			writer.WriteHeader(http.StatusAccepted)
		case request.Method == http.MethodPatch && strings.HasSuffix(request.URL.Path, "/settings"):
			writer.WriteHeader(http.StatusAccepted)
		case request.Method == http.MethodGet && strings.HasSuffix(request.URL.Path, "/documents"):
			writer.Header().Set("Content-Type", "application/json")
			_, _ = writer.Write([]byte(fmt.Sprintf(`{"results":[{"search_id":%q},{"search_id":%q}],"total":2,"offset":0,"limit":1000}`, keepID, staleID)))
		case request.Method == http.MethodPut && strings.HasSuffix(request.URL.Path, "/documents"):
			if err := json.NewDecoder(request.Body).Decode(&upserted); err != nil {
				t.Fatal(err)
			}
			writer.WriteHeader(http.StatusAccepted)
		case request.Method == http.MethodPost && strings.HasSuffix(request.URL.Path, "/documents/delete"):
			var body map[string]any
			if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			deletedFilter = firstString(body["filter"])
			writer.WriteHeader(http.StatusAccepted)
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	index := newMeiliSearchIndex(config.Config{
		MeiliURL: server.URL, MeiliIndex: "movies", MeiliTimeout: time.Second, MeiliBatchSize: 20,
	})
	defer index.Close()
	err := index.SyncSnapshot(context.Background(), []map[string]any{{
		"name": "Bố Già", "origin_name": "The Godfather", "slug": "the-godfather", "year": 1972,
		"type": "single", "_canonicalKey": canonical,
	}}, true)
	if err != nil {
		t.Fatal(err)
	}
	if len(upserted) != 1 || firstString(upserted[0]["search_id"]) != keepID {
		t.Fatalf("snapshot did not upsert the canonical document: %#v", upserted)
	}
	if !strings.Contains(deletedFilter, staleID) || strings.Contains(deletedFilter, keepID) {
		t.Fatalf("snapshot pruned the wrong ids: %q", deletedFilter)
	}
	status := index.Status(context.Background())
	if status.LastSyncItems != 1 || status.LastSyncDeleted != 1 || status.LastSyncCompletedAt == 0 {
		t.Fatalf("snapshot status is incomplete: %#v", status)
	}
}
