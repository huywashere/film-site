package catalog

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/netphim/media-gateway/internal/config"
)

func TestTypesenseDocumentKeepsSourceFallbackMetadata(t *testing.T) {
	movie := map[string]any{
		"name": "Bố Già", "origin_name": "The Godfather", "slug": "bo-gia", "year": 1972,
		"type": "single", "category": []any{map[string]any{"name": "Chính kịch", "slug": "chinh-kich"}},
		"_canonicalKey": "the godfather:1972", "_sources": []string{"kkphim", "ophim"},
		"_sourceSlugs": map[string]any{"kkphim": "bo-gia", "ophim": "the-godfather"},
	}
	document := typesenseDocument(movie)
	if document["id"] == "" || document["search_type"] != "single" {
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
	second := typesenseDocument(movie)
	if document["id"] != second["id"] {
		t.Fatal("the same canonical movie must always receive the same search id")
	}
}

func TestTypesenseDeleteCanonicalQueuesStableDocumentID(t *testing.T) {
	deleteCalled := make(chan string, 1)
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch {
		case request.Method == http.MethodGet && request.URL.Path == "/collections/movies":
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"name":"movies","num_documents":1}`))
		case request.Method == http.MethodDelete && request.URL.Path == "/collections/movies/documents":
			filter := request.URL.Query().Get("filter_by")
			deleteCalled <- filter
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"num_deleted":1}`))
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	index := newTypesenseSearchIndex(config.Config{
		TypesenseURL: server.URL, TypesenseCollection: "movies", TypesenseTimeout: time.Second, SearchBatchSize: 1,
	})
	defer index.Close()
	index.DeleteCanonical([]string{"the godfather:1972"})

	var filter string
	select {
	case filter = <-deleteCalled:
	case <-time.After(time.Second):
		t.Fatal("delete mutation was not flushed")
	}
	digest := sha256.Sum256([]byte("the godfather:1972"))
	expectedID := hex.EncodeToString(digest[:])
	if !strings.Contains(filter, expectedID) {
		t.Fatalf("delete filter does not contain stable document id: %q, expected %q", filter, expectedID)
	}
}

func TestTypesenseSearchUsesApiKeyAndFilters(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch {
		case request.Method == http.MethodGet && request.URL.Path == "/collections/movies":
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"name":"movies"}`))
		case request.Method == http.MethodGet && request.URL.Path == "/collections/movies/documents/search":
			if key := request.Header.Get("X-TYPESENSE-API-KEY"); key != "test-api-key" {
				t.Fatalf("unexpected API key: %q", key)
			}
			query := request.URL.Query()
			if query.Get("q") != "godfather" {
				t.Fatalf("unexpected query string: %q", query.Get("q"))
			}
			filter := query.Get("filter_by")
			if !strings.Contains(filter, "search_type:=`single`") || !strings.Contains(filter, "search_year:=1972") {
				t.Fatalf("expected structured search filter expression, got %q", filter)
			}
			writer.Header().Set("Content-Type", "application/json")
			_, _ = writer.Write([]byte(`{
				"found": 1,
				"out_of": 1,
				"page": 1,
				"search_time_ms": 3,
				"hits": [
					{
						"document": {
							"id": "abc123",
							"name": "Bố Già",
							"slug": "bo-gia",
							"search_type": "single",
							"search_year": 1972
						}
					}
				]
			}`))
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	index := newTypesenseSearchIndex(config.Config{
		TypesenseURL: server.URL, TypesenseAPIKey: "test-api-key", TypesenseCollection: "movies",
		TypesenseTimeout: time.Second, SearchBatchSize: 10,
	})
	defer index.Close()

	response, err := index.Search(context.Background(), "godfather", 1, 10, SearchFilters{Type: "single", Year: 1972})
	if err != nil {
		t.Fatal(err)
	}
	if response.TotalHits != 1 || len(response.Hits) != 1 {
		t.Fatalf("unexpected search response: %#v", response)
	}
	if hit := response.Hits[0]; hit["name"] != "Bố Già" || hit["search_type"] != nil {
		t.Fatalf("hit was not sanitized: %#v", hit)
	}
}

func TestTypesenseFailureOpensCircuitForImmediateProviderFallback(t *testing.T) {
	var requests atomic.Int64
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		requests.Add(1)
		writer.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	index := newTypesenseSearchIndex(config.Config{
		TypesenseURL: server.URL, TypesenseCollection: "movies", TypesenseTimeout: time.Second, SearchBatchSize: 20,
	})
	defer index.Close()

	_, firstErr := index.Search(context.Background(), "avatar", 1, 10, SearchFilters{})
	before := requests.Load()
	started := time.Now()
	_, secondErr := index.Search(context.Background(), "avatar", 1, 10, SearchFilters{})
	if firstErr == nil || secondErr == nil {
		t.Fatal("failed Typesense calls must fall back")
	}
	if requests.Load() != before || time.Since(started) > 50*time.Millisecond {
		t.Fatalf("open circuit should avoid another network call: before=%d after=%d elapsed=%s", before, requests.Load(), time.Since(started))
	}
}

func TestTypesenseSnapshotUpsertsAndPrunesOnlyMissingDocuments(t *testing.T) {
	upsertLines := make([]string, 0)
	deletedFilter := ""

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch {
		case request.Method == http.MethodGet && request.URL.Path == "/collections/movies":
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"name":"movies","num_documents":2}`))
		case request.Method == http.MethodGet && request.URL.Path == "/collections/movies/documents/export":
			writer.Header().Set("Content-Type", "text/plain")
			digestRetain := sha256.Sum256([]byte("retain:2024"))
			digestStale := sha256.Sum256([]byte("stale:2020"))
			_, _ = fmt.Fprintf(writer, "{\"id\":\"%s\"}\n{\"id\":\"%s\"}\n",
				hex.EncodeToString(digestRetain[:]), hex.EncodeToString(digestStale[:]))
		case request.Method == http.MethodPost && request.URL.Path == "/collections/movies/documents/import":
			body, _ := io.ReadAll(request.Body)
			lines := strings.Split(strings.TrimSpace(string(body)), "\n")
			upsertLines = append(upsertLines, lines...)
			writer.WriteHeader(http.StatusOK)
			for range lines {
				_, _ = writer.Write([]byte("{\"success\":true}\n"))
			}
		case request.Method == http.MethodDelete && request.URL.Path == "/collections/movies/documents":
			deletedFilter = request.URL.Query().Get("filter_by")
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"num_deleted":1}`))
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	index := newTypesenseSearchIndex(config.Config{
		TypesenseURL: server.URL, TypesenseCollection: "movies", TypesenseTimeout: time.Second, SearchBatchSize: 10,
	})
	defer index.Close()

	movies := []map[string]any{
		{"name": "Retained", "slug": "retained", "year": 2024, "_canonicalKey": "retain:2024"},
		{"name": "New Movie", "slug": "new-movie", "year": 2025, "_canonicalKey": "new:2025"},
	}
	if err := index.SyncSnapshot(context.Background(), movies, true); err != nil {
		t.Fatal(err)
	}

	if len(upsertLines) != 2 {
		t.Fatalf("expected 2 documents imported, got %d", len(upsertLines))
	}
	digestStale := sha256.Sum256([]byte("stale:2020"))
	expectedDeletedID := hex.EncodeToString(digestStale[:])
	if !strings.Contains(deletedFilter, expectedDeletedID) {
		t.Fatalf("expected stale document %q to be deleted, got filter %q", expectedDeletedID, deletedFilter)
	}
}
