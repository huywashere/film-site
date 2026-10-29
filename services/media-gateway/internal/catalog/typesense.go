package catalog

import (
	"bufio"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/netphim/media-gateway/internal/config"
)

// Typesense is a derived, high-performance in-memory search index. Provider/PostgreSQL
// data remains authoritative; every search failure falls back to the existing multi-provider implementation.
type typesenseSearchIndex struct {
	baseURL    string
	apiKey     string
	collection string
	client     *http.Client
	batchSize  int

	queue  chan typesenseMutation
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup

	setupMu             sync.Mutex
	ready               atomic.Bool
	retryAt             atomic.Int64
	indexed             atomic.Int64
	deleted             atomic.Int64
	dropped             atomic.Int64
	failures            atomic.Int64
	lastWriteAt         atomic.Int64
	syncRunning         atomic.Bool
	lastSyncStartedAt   atomic.Int64
	lastSyncCompletedAt atomic.Int64
	lastSyncItems       atomic.Int64
	lastSyncDeleted     atomic.Int64
	lastSyncError       atomic.Value
}

type typesenseMutation struct {
	document map[string]any
	deleteID string
}

type typesenseRawSearchResponse struct {
	Found        int `json:"found"`
	OutOf        int `json:"out_of"`
	Page         int `json:"page"`
	SearchTimeMS int `json:"search_time_ms"`
	Hits         []struct {
		Document map[string]any `json:"document"`
	} `json:"hits"`
}

func newTypesenseSearchIndex(cfg config.Config) *typesenseSearchIndex {
	if cfg.TypesenseURL == "" {
		return nil
	}
	parsed, err := url.Parse(cfg.TypesenseURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	batchSize := cfg.SearchBatchSize
	if batchSize <= 0 {
		batchSize = 200
	}
	timeout := cfg.TypesenseTimeout
	if timeout <= 0 {
		timeout = 1200 * time.Millisecond
	}
	index := &typesenseSearchIndex{
		baseURL:    strings.TrimRight(cfg.TypesenseURL, "/"),
		apiKey:     cfg.TypesenseAPIKey,
		collection: cleanTypesenseCollectionName(cfg.TypesenseCollection),
		client:     &http.Client{Timeout: timeout},
		batchSize:  batchSize,
		queue:      make(chan typesenseMutation, maxInt(batchSize*4, 800)),
		ctx:        ctx,
		cancel:     cancel,
	}
	index.wg.Add(1)
	go index.runWriter()
	return index
}

func cleanTypesenseCollectionName(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "movies"
	}
	var builder strings.Builder
	for _, character := range value {
		if (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z') || (character >= '0' && character <= '9') || character == '-' || character == '_' {
			builder.WriteRune(character)
		}
	}
	if builder.Len() == 0 {
		return "movies"
	}
	return builder.String()
}

func (t *typesenseSearchIndex) Engine() string {
	return "typesense"
}

func (t *typesenseSearchIndex) IsReady() bool {
	if t == nil {
		return false
	}
	return t.ready.Load()
}

func (t *typesenseSearchIndex) Close() {
	if t == nil {
		return
	}
	t.cancel()
	t.wg.Wait()
	t.client.CloseIdleConnections()
}

func (t *typesenseSearchIndex) Enqueue(items []map[string]any) {
	if t == nil {
		return
	}
	for _, item := range items {
		document := typesenseDocument(item)
		if document == nil {
			continue
		}
		select {
		case t.queue <- typesenseMutation{document: document}:
		default:
			t.dropped.Add(1)
		}
	}
}

func (t *typesenseSearchIndex) DeleteCanonical(canonicalKeys []string) {
	if t == nil {
		return
	}
	for _, canonical := range canonicalKeys {
		canonical = strings.TrimSpace(canonical)
		if canonical == "" {
			continue
		}
		digest := sha256.Sum256([]byte(canonical))
		select {
		case t.queue <- typesenseMutation{deleteID: hex.EncodeToString(digest[:])}:
		default:
			t.dropped.Add(1)
		}
	}
}

func (t *typesenseSearchIndex) Search(ctx context.Context, query string, page, limit int, filters SearchFilters) (searchResponse, error) {
	if t == nil {
		return searchResponse{}, errors.New("typesense is disabled")
	}
	if !t.canAttempt() {
		return searchResponse{}, errors.New("typesense circuit is open")
	}
	if err := t.ensureCollection(ctx); err != nil {
		t.markFailure()
		return searchResponse{}, err
	}

	q := strings.TrimSpace(query)
	if q == "" {
		q = "*"
	}
	params := url.Values{}
	params.Set("q", q)
	params.Set("query_by", "name,origin_name,search_aliases,search_aliases_normalized,search_aliases_compact,actor,search_cast_normalized,director,search_director_normalized,description")
	params.Set("query_by_weights", "10,8,7,7,6,4,4,3,3,1")
	params.Set("page", strconv.Itoa(maxInt(1, page)))
	params.Set("per_page", strconv.Itoa(maxInt(1, limit)))
	params.Set("sort_by", "search_popularity:desc,search_year:desc,search_quality:desc")
	params.Set("num_typos", "2")
	params.Set("min_len_1typo", "4")
	params.Set("min_len_2typo", "8")
	params.Set("prioritize_exact_match", "true")

	if filterExpr := typesenseFilters(filters); filterExpr != "" {
		params.Set("filter_by", filterExpr)
	}

	searchPath := fmt.Sprintf("/collections/%s/documents/search?%s", url.PathEscape(t.collection), params.Encode())
	var raw typesenseRawSearchResponse
	if err := t.requestJSON(ctx, http.MethodGet, searchPath, nil, &raw, http.StatusOK); err != nil {
		t.markFailure()
		return searchResponse{}, err
	}
	t.retryAt.Store(0)

	hits := make([]map[string]any, 0, len(raw.Hits))
	for _, hit := range raw.Hits {
		doc := hit.Document
		if doc == nil {
			continue
		}
		delete(doc, "id")
		delete(doc, "search_id")
		delete(doc, "search_aliases")
		delete(doc, "search_aliases_normalized")
		delete(doc, "search_aliases_compact")
		delete(doc, "search_cast_normalized")
		delete(doc, "search_director_normalized")
		delete(doc, "search_type")
		delete(doc, "search_year")
		delete(doc, "search_status")
		delete(doc, "search_genres")
		delete(doc, "search_countries")
		delete(doc, "search_popularity")
		delete(doc, "search_quality")
		hits = append(hits, doc)
	}

	return searchResponse{
		Hits:               hits,
		EstimatedTotalHits: raw.Found,
		TotalHits:          raw.Found,
		ProcessingTimeMS:   raw.SearchTimeMS,
	}, nil
}

func (t *typesenseSearchIndex) runWriter() {
	defer t.wg.Done()
	timer := time.NewTimer(time.Hour)
	if !timer.Stop() {
		<-timer.C
	}
	batch := make([]map[string]any, 0, t.batchSize)
	deletes := make([]string, 0, t.batchSize)
	flush := func() {
		if len(batch) == 0 && len(deletes) == 0 {
			return
		}
		ctx, cancel := context.WithTimeout(t.ctx, t.client.Timeout)
		if len(batch) > 0 {
			_ = t.upsert(ctx, batch)
		}
		if len(deletes) > 0 {
			_ = t.deleteDocuments(ctx, deletes)
		}
		cancel()
		batch = batch[:0]
		deletes = deletes[:0]
	}

	for {
		select {
		case <-t.ctx.Done():
			flush()
			return
		case mutation := <-t.queue:
			if mutation.document != nil {
				batch = append(batch, mutation.document)
			} else if mutation.deleteID != "" {
				deletes = append(deletes, mutation.deleteID)
			}
			if len(batch)+len(deletes) == 1 {
				timer.Reset(250 * time.Millisecond)
			}
			if len(batch)+len(deletes) >= t.batchSize {
				if !timer.Stop() {
					select {
					case <-timer.C:
					default:
					}
				}
				flush()
			}
		case <-timer.C:
			flush()
		}
	}
}

func (t *typesenseSearchIndex) upsert(ctx context.Context, documents []map[string]any) error {
	if !t.canAttempt() {
		return errors.New("typesense circuit is open")
	}
	if err := t.ensureCollection(ctx); err != nil {
		t.markFailure()
		return err
	}

	var jsonlBuffer bytes.Buffer
	for _, doc := range documents {
		encoded, err := json.Marshal(doc)
		if err != nil {
			continue
		}
		jsonlBuffer.Write(encoded)
		jsonlBuffer.WriteByte('\n')
	}
	if jsonlBuffer.Len() == 0 {
		return nil
	}

	importPath := fmt.Sprintf("/collections/%s/documents/import?action=upsert", url.PathEscape(t.collection))
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, t.baseURL+importPath, &jsonlBuffer)
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "text/plain")
	if t.apiKey != "" {
		request.Header.Set("X-TYPESENSE-API-KEY", t.apiKey)
	}

	response, err := t.client.Do(request)
	if err != nil {
		t.markFailure()
		return err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusCreated {
		t.markFailure()
		message, _ := io.ReadAll(io.LimitReader(response.Body, 2048))
		return fmt.Errorf("typesense import returned %d: %s", response.StatusCode, strings.TrimSpace(string(message)))
	}

	t.retryAt.Store(0)
	t.indexed.Add(int64(len(documents)))
	t.lastWriteAt.Store(time.Now().Unix())
	return nil
}

func (t *typesenseSearchIndex) deleteDocuments(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	if err := t.ensureCollection(ctx); err != nil {
		t.markFailure()
		return err
	}

	deletePath := fmt.Sprintf("/collections/%s/documents?filter_by=id:=[%s]", url.PathEscape(t.collection), strings.Join(ids, ","))
	if err := t.requestJSON(ctx, http.MethodDelete, deletePath, nil, nil, http.StatusOK, http.StatusNotFound); err != nil {
		t.markFailure()
		return err
	}
	t.deleted.Add(int64(len(ids)))
	t.lastWriteAt.Store(time.Now().Unix())
	return nil
}

func (t *typesenseSearchIndex) documentIDs(ctx context.Context) (map[string]bool, error) {
	if err := t.ensureCollection(ctx); err != nil {
		return nil, err
	}
	exportPath := fmt.Sprintf("/collections/%s/documents/export?exclude_fields=*&include_fields=id", url.PathEscape(t.collection))
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, t.baseURL+exportPath, nil)
	if err != nil {
		return nil, err
	}
	if t.apiKey != "" {
		request.Header.Set("X-TYPESENSE-API-KEY", t.apiKey)
	}

	response, err := t.client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		message, _ := io.ReadAll(io.LimitReader(response.Body, 2048))
		return nil, fmt.Errorf("typesense export returned %d: %s", response.StatusCode, strings.TrimSpace(string(message)))
	}

	result := make(map[string]bool)
	scanner := bufio.NewScanner(response.Body)
	// Buffer up to 1MB per line if needed
	buf := make([]byte, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		line := bytes.TrimSpace(scanner.Bytes())
		if len(line) == 0 {
			continue
		}
		var item struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(line, &item); err == nil && item.ID != "" {
			result[item.ID] = true
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (t *typesenseSearchIndex) SyncSnapshot(ctx context.Context, movies []map[string]any, prune bool) error {
	if t == nil || len(movies) == 0 {
		return errors.New("search snapshot is empty")
	}
	if !t.syncRunning.CompareAndSwap(false, true) {
		return errors.New("search snapshot sync is already running")
	}
	defer t.syncRunning.Store(false)
	t.lastSyncStartedAt.Store(time.Now().Unix())
	t.lastSyncError.Store("")

	var existing map[string]bool
	var err error
	if prune {
		existing, err = t.documentIDs(ctx)
		if err != nil {
			t.lastSyncError.Store(err.Error())
			return err
		}
	}

	documents := make([]map[string]any, 0, len(movies))
	seen := make(map[string]bool, len(movies))
	for _, movie := range movies {
		document := typesenseDocument(movie)
		if document == nil {
			continue
		}
		id := firstString(document["id"])
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		documents = append(documents, document)
	}
	if len(documents) == 0 {
		err = errors.New("search snapshot contains no indexable documents")
		t.lastSyncError.Store(err.Error())
		return err
	}

	batchSize := maxInt(10, t.batchSize)
	for start := 0; start < len(documents); start += batchSize {
		end := minInt(start+batchSize, len(documents))
		if err = t.upsert(ctx, documents[start:end]); err != nil {
			t.lastSyncError.Store(err.Error())
			return err
		}
	}

	deleted := 0
	if prune && len(existing) > 0 {
		stale := make([]string, 0)
		for id := range existing {
			if !seen[id] {
				stale = append(stale, id)
			}
		}
		for start := 0; start < len(stale); start += 500 {
			end := minInt(start+500, len(stale))
			if err = t.deleteDocuments(ctx, stale[start:end]); err != nil {
				t.lastSyncError.Store(err.Error())
				return err
			}
			deleted += end - start
		}
	}

	t.lastSyncItems.Store(int64(len(documents)))
	t.lastSyncDeleted.Store(int64(deleted))
	t.lastSyncCompletedAt.Store(time.Now().Unix())
	return nil
}

func (t *typesenseSearchIndex) canAttempt() bool {
	retryAt := t.retryAt.Load()
	return retryAt == 0 || time.Now().UnixNano() >= retryAt
}

func (t *typesenseSearchIndex) markFailure() {
	t.ready.Store(false)
	t.failures.Add(1)
	t.retryAt.Store(time.Now().Add(20 * time.Second).UnixNano())
}

func (t *typesenseSearchIndex) ensureCollection(ctx context.Context) error {
	if t.ready.Load() {
		return nil
	}
	t.setupMu.Lock()
	defer t.setupMu.Unlock()
	if t.ready.Load() {
		return nil
	}

	// 1. Check if collection already exists
	checkPath := fmt.Sprintf("/collections/%s", url.PathEscape(t.collection))
	var colInfo struct {
		Name string `json:"name"`
	}
	err := t.requestJSON(ctx, http.MethodGet, checkPath, nil, &colInfo, http.StatusOK, http.StatusNotFound)
	if err == nil && colInfo.Name != "" {
		t.ready.Store(true)
		return nil
	}
	if err != nil {
		return err
	}

	// 2. Create collection schema with nested fields enabled
	schema := map[string]any{
		"name": t.collection,
		"fields": []map[string]any{
			{"name": "id", "type": "string"},
			{"name": "name", "type": "string"},
			{"name": "origin_name", "type": "string", "optional": true},
			{"name": "slug", "type": "string", "optional": true},
			{"name": "search_aliases", "type": "string[]", "optional": true},
			{"name": "search_aliases_normalized", "type": "string[]", "optional": true},
			{"name": "search_aliases_compact", "type": "string[]", "optional": true},
			{"name": "actor", "type": "string[]", "optional": true},
			{"name": "search_cast_normalized", "type": "string[]", "optional": true},
			{"name": "director", "type": "string[]", "optional": true},
			{"name": "search_director_normalized", "type": "string[]", "optional": true},
			{"name": "description", "type": "string", "optional": true},
			{"name": "search_type", "type": "string", "facet": true, "optional": true},
			{"name": "search_year", "type": "int32", "facet": true, "optional": true},
			{"name": "search_status", "type": "string", "facet": true, "optional": true},
			{"name": "search_genres", "type": "string[]", "facet": true, "optional": true},
			{"name": "search_countries", "type": "string[]", "facet": true, "optional": true},
			{"name": "search_popularity", "type": "int64", "optional": true},
			{"name": "search_quality", "type": "int32", "optional": true},
			{"name": "year", "type": "int32", "optional": true},
			{"name": ".*", "type": "auto"},
		},
		"default_sorting_field": "search_popularity",
		"enable_nested_fields":  true,
	}

	if err := t.requestJSON(ctx, http.MethodPost, "/collections", schema, nil, http.StatusCreated, http.StatusOK, http.StatusConflict); err != nil {
		return err
	}

	// 3. Register synonyms
	for i, group := range searchSynonymGroups {
		if len(group) < 2 {
			continue
		}
		synonymID := fmt.Sprintf("synonym-%d", i)
		synonymBody := map[string]any{
			"synonyms": group,
		}
		synonymPath := fmt.Sprintf("/collections/%s/synonyms/%s", url.PathEscape(t.collection), url.PathEscape(synonymID))
		_ = t.requestJSON(ctx, http.MethodPut, synonymPath, synonymBody, nil, http.StatusOK, http.StatusCreated)
	}

	t.ready.Store(true)
	return nil
}

func (t *typesenseSearchIndex) requestJSON(ctx context.Context, method, path string, input, output any, expected ...int) error {
	var body io.Reader
	if input != nil {
		encoded, err := json.Marshal(input)
		if err != nil {
			return err
		}
		body = bytes.NewReader(encoded)
	}
	request, err := http.NewRequestWithContext(ctx, method, t.baseURL+path, body)
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	if input != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if t.apiKey != "" {
		request.Header.Set("X-TYPESENSE-API-KEY", t.apiKey)
	}
	response, err := t.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	valid := false
	for _, status := range expected {
		if response.StatusCode == status {
			valid = true
			break
		}
	}
	if !valid {
		message, _ := io.ReadAll(io.LimitReader(response.Body, 2048))
		return fmt.Errorf("typesense %s %s returned %d: %s", method, path, response.StatusCode, strings.TrimSpace(string(message)))
	}
	if output == nil || response.StatusCode == http.StatusNoContent {
		return nil
	}
	return json.NewDecoder(io.LimitReader(response.Body, 16*1024*1024)).Decode(output)
}

func typesenseDocument(movie map[string]any) map[string]any {
	canonical := firstString(movie["_canonicalKey"])
	if canonical == "" {
		name := firstString(movie["name"], movie["title"])
		origin := firstString(movie["origin_name"], movie["original_name"])
		canonical = canonicalKey(movie, name, origin, numberValue(movie["year"]))
	}
	if canonical == "" || canonical == "film:" {
		return nil
	}
	digest := sha256.Sum256([]byte(canonical))
	id := hex.EncodeToString(digest[:])

	document := make(map[string]any, len(movie)+10)
	for key, value := range movie {
		document[key] = value
	}
	aliases := uniqueStrings([]string{
		firstString(movie["name"], movie["title"]),
		firstString(movie["origin_name"], movie["original_name"]),
		firstString(movie["slug"]),
	})
	cast := namedValues(movie["actor"])
	if len(cast) == 0 {
		cast = namedValues(movie["actors"])
	}
	directors := namedValues(movie["director"])
	searchAliases := movieSearchAliases(movie)

	document["id"] = id
	document["search_id"] = id
	document["search_aliases"] = aliases
	document["search_aliases_normalized"] = searchAliases
	document["search_aliases_compact"] = compactStrings(searchAliases)
	document["search_cast_normalized"] = normalizedStrings(cast)
	document["search_director_normalized"] = normalizedStrings(directors)
	document["search_type"] = canonicalMediaType(movie)
	document["search_year"] = numberValue(movie["year"])
	document["search_status"] = normalizeText(firstString(movie["status"]))
	document["search_genres"] = normalizedNamedValues(movie["category"], movie["genre"])
	document["search_countries"] = normalizedNamedValues(movie["country"])
	document["search_popularity"] = int64(maxInt(numberValue(movie["views"]), numberValue(movie["view"])))
	document["search_quality"] = movieQualityScore(movie)
	if yr := numberValue(movie["year"]); yr > 0 {
		document["year"] = yr
	}
	return document
}

func (t *typesenseSearchIndex) Status(ctx context.Context) searchStatus {
	status := searchStatus{
		Enabled: t != nil,
		Engine:  "typesense",
	}
	if t == nil {
		return status
	}
	status.Ready = t.ready.Load()
	status.QueueDepth = len(t.queue)
	status.QueueCapacity = cap(t.queue)
	status.Indexed = t.indexed.Load()
	status.Deleted = t.deleted.Load()
	status.Dropped = t.dropped.Load()
	status.Failures = t.failures.Load()
	status.LastWriteAt = t.lastWriteAt.Load()
	status.SyncRunning = t.syncRunning.Load()
	status.LastSyncStartedAt = t.lastSyncStartedAt.Load()
	status.LastSyncCompletedAt = t.lastSyncCompletedAt.Load()
	status.LastSyncItems = t.lastSyncItems.Load()
	status.LastSyncDeleted = t.lastSyncDeleted.Load()
	if value := t.lastSyncError.Load(); value != nil {
		status.LastSyncError, _ = value.(string)
	}

	var remote struct {
		NumDocuments int `json:"num_documents"`
	}
	if t.canAttempt() && t.requestJSON(ctx, http.MethodGet, "/collections/"+url.PathEscape(t.collection), nil, &remote, http.StatusOK) == nil {
		status.Documents = remote.NumDocuments
	}
	return status
}

func typesenseFilters(filters SearchFilters) string {
	parts := make([]string, 0, 5)
	if filters.Type != "" {
		parts = append(parts, fmt.Sprintf("search_type:=`%s`", normalizedMovieType(filters.Type)))
	}
	if filters.Year > 0 {
		parts = append(parts, fmt.Sprintf("search_year:=%d", filters.Year))
	}
	if filters.Status != "" {
		parts = append(parts, fmt.Sprintf("search_status:=`%s`", normalizeText(filters.Status)))
	}
	if filters.Genre != "" {
		parts = append(parts, fmt.Sprintf("search_genres:[`%s`]", normalizeText(filters.Genre)))
	}
	if filters.Country != "" {
		parts = append(parts, fmt.Sprintf("search_countries:[`%s`]", normalizeText(filters.Country)))
	}
	return strings.Join(parts, " && ")
}
