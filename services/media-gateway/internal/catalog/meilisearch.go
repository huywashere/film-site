package catalog

import (
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

// Meilisearch is a derived, disposable search index. Provider/PostgreSQL data
// remains authoritative; every search failure falls back to the existing
// multi-provider implementation.
type meiliSearchIndex struct {
	baseURL   string
	apiKey    string
	index     string
	client    *http.Client
	batchSize int

	queue  chan meiliMutation
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup

	setupMu     sync.Mutex
	ready       atomic.Bool
	retryAt     atomic.Int64
	indexed     atomic.Int64
	deleted     atomic.Int64
	dropped     atomic.Int64
	failures    atomic.Int64
	lastWriteAt atomic.Int64
}

type meiliMutation struct {
	document map[string]any
	deleteID string
}

type meiliStatus struct {
	Enabled       bool  `json:"enabled"`
	Ready         bool  `json:"ready"`
	QueueDepth    int   `json:"queueDepth"`
	QueueCapacity int   `json:"queueCapacity"`
	Indexed       int64 `json:"indexed"`
	Deleted       int64 `json:"deleted"`
	Dropped       int64 `json:"notIndexedQueueDrops"`
	Failures      int64 `json:"failures"`
	Documents     int   `json:"documents"`
	LastWriteAt   int64 `json:"lastWriteAt"`
}

type meiliSearchResponse struct {
	Hits               []map[string]any `json:"hits"`
	EstimatedTotalHits int              `json:"estimatedTotalHits"`
	TotalHits          int              `json:"totalHits"`
	ProcessingTimeMS   int              `json:"processingTimeMs"`
}

func newMeiliSearchIndex(cfg config.Config) *meiliSearchIndex {
	if cfg.MeiliURL == "" {
		return nil
	}
	parsed, err := url.Parse(cfg.MeiliURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	index := &meiliSearchIndex{
		baseURL:   strings.TrimRight(cfg.MeiliURL, "/"),
		apiKey:    cfg.MeiliAPIKey,
		index:     cleanMeiliIndexName(cfg.MeiliIndex),
		client:    &http.Client{Timeout: cfg.MeiliTimeout},
		batchSize: cfg.MeiliBatchSize,
		queue:     make(chan meiliMutation, maxInt(cfg.MeiliBatchSize*4, 800)),
		ctx:       ctx,
		cancel:    cancel,
	}
	index.wg.Add(1)
	go index.runWriter()
	return index
}

func cleanMeiliIndexName(value string) string {
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

func (m *meiliSearchIndex) Close() {
	if m == nil {
		return
	}
	m.cancel()
	m.wg.Wait()
	m.client.CloseIdleConnections()
}

func (m *meiliSearchIndex) Enqueue(items []map[string]any) {
	if m == nil {
		return
	}
	for _, item := range items {
		document := meiliDocument(item)
		if document == nil {
			continue
		}
		select {
		case m.queue <- meiliMutation{document: document}:
		default:
			// Search indexing must never add latency or back-pressure to movie
			// playback/catalogue requests. Periodic warmup will retry later.
			m.dropped.Add(1)
		}
	}
}

func (m *meiliSearchIndex) DeleteCanonical(canonicalKeys []string) {
	if m == nil {
		return
	}
	for _, canonical := range canonicalKeys {
		canonical = strings.TrimSpace(canonical)
		if canonical == "" {
			continue
		}
		digest := sha256.Sum256([]byte(canonical))
		select {
		case m.queue <- meiliMutation{deleteID: hex.EncodeToString(digest[:])}:
		default:
			m.dropped.Add(1)
		}
	}
}

func (m *meiliSearchIndex) Search(ctx context.Context, query string, page, limit int, filters SearchFilters) (meiliSearchResponse, error) {
	if m == nil {
		return meiliSearchResponse{}, errors.New("meilisearch is disabled")
	}
	if !m.canAttempt() {
		return meiliSearchResponse{}, errors.New("meilisearch circuit is open")
	}
	if err := m.ensureIndex(ctx); err != nil {
		m.markFailure()
		return meiliSearchResponse{}, err
	}
	body := map[string]any{
		"q":                     query,
		"offset":                maxInt(0, (page-1)*limit),
		"limit":                 limit,
		"attributesToHighlight": []string{},
		"attributesToCrop":      []string{},
		"showRankingScore":      true,
	}
	if expressions := meiliFilters(filters); len(expressions) > 0 {
		body["filter"] = expressions
	}
	var response meiliSearchResponse
	if err := m.requestJSON(ctx, http.MethodPost, "/indexes/"+url.PathEscape(m.index)+"/search", body, &response, http.StatusOK); err != nil {
		m.markFailure()
		return meiliSearchResponse{}, err
	}
	m.retryAt.Store(0)
	if response.EstimatedTotalHits == 0 {
		response.EstimatedTotalHits = response.TotalHits
	}
	for _, hit := range response.Hits {
		delete(hit, "search_id")
		delete(hit, "search_aliases")
		delete(hit, "search_aliases_normalized")
		delete(hit, "search_cast_normalized")
		delete(hit, "search_type")
		delete(hit, "search_year")
		delete(hit, "search_status")
		delete(hit, "search_genres")
		delete(hit, "search_countries")
		delete(hit, "search_popularity")
		delete(hit, "search_quality")
		delete(hit, "_rankingScore")
	}
	return response, nil
}

func (m *meiliSearchIndex) runWriter() {
	defer m.wg.Done()
	timer := time.NewTimer(time.Hour)
	if !timer.Stop() {
		<-timer.C
	}
	batch := make([]map[string]any, 0, m.batchSize)
	deletes := make([]string, 0, m.batchSize)
	flush := func() {
		if len(batch) == 0 && len(deletes) == 0 {
			return
		}
		ctx, cancel := context.WithTimeout(m.ctx, m.client.Timeout)
		if len(batch) > 0 {
			_ = m.upsert(ctx, batch)
		}
		if len(deletes) > 0 {
			_ = m.deleteDocuments(ctx, deletes)
		}
		cancel()
		batch = batch[:0]
		deletes = deletes[:0]
	}
	for {
		select {
		case <-m.ctx.Done():
			flush()
			return
		case mutation := <-m.queue:
			if mutation.document != nil {
				batch = append(batch, mutation.document)
			} else if mutation.deleteID != "" {
				deletes = append(deletes, mutation.deleteID)
			}
			if len(batch)+len(deletes) == 1 {
				timer.Reset(250 * time.Millisecond)
			}
			if len(batch)+len(deletes) >= m.batchSize {
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

func (m *meiliSearchIndex) upsert(ctx context.Context, documents []map[string]any) error {
	if !m.canAttempt() {
		return errors.New("meilisearch circuit is open")
	}
	if err := m.ensureIndex(ctx); err != nil {
		m.markFailure()
		return err
	}
	if err := m.requestJSON(ctx, http.MethodPut, "/indexes/"+url.PathEscape(m.index)+"/documents?primaryKey=search_id", documents, nil, http.StatusAccepted, http.StatusOK); err != nil {
		m.markFailure()
		return err
	}
	m.retryAt.Store(0)
	m.indexed.Add(int64(len(documents)))
	m.lastWriteAt.Store(time.Now().Unix())
	return nil
}

func (m *meiliSearchIndex) deleteDocuments(ctx context.Context, ids []string) error {
	if err := m.ensureIndex(ctx); err != nil {
		m.markFailure()
		return err
	}
	body := map[string]any{"filter": "search_id IN [" + quotedCSV(ids) + "]"}
	if err := m.requestJSON(ctx, http.MethodPost, "/indexes/"+url.PathEscape(m.index)+"/documents/delete", body, nil, http.StatusAccepted, http.StatusOK); err != nil {
		m.markFailure()
		return err
	}
	m.deleted.Add(int64(len(ids)))
	m.lastWriteAt.Store(time.Now().Unix())
	return nil
}

func quotedCSV(values []string) string {
	quoted := make([]string, 0, len(values))
	for _, value := range values {
		quoted = append(quoted, strconv.Quote(value))
	}
	return strings.Join(quoted, ",")
}

func (m *meiliSearchIndex) canAttempt() bool {
	retryAt := m.retryAt.Load()
	return retryAt == 0 || time.Now().UnixNano() >= retryAt
}

func (m *meiliSearchIndex) markFailure() {
	m.ready.Store(false)
	m.failures.Add(1)
	m.retryAt.Store(time.Now().Add(20 * time.Second).UnixNano())
}

func (m *meiliSearchIndex) ensureIndex(ctx context.Context) error {
	if m.ready.Load() {
		return nil
	}
	m.setupMu.Lock()
	defer m.setupMu.Unlock()
	if m.ready.Load() {
		return nil
	}
	create := map[string]any{"uid": m.index, "primaryKey": "search_id"}
	if err := m.requestJSON(ctx, http.MethodPost, "/indexes", create, nil, http.StatusAccepted, http.StatusCreated, http.StatusConflict); err != nil {
		return err
	}
	settings := map[string]any{
		"searchableAttributes": []string{"name", "origin_name", "search_aliases", "search_aliases_normalized", "actor", "search_cast_normalized", "director", "description"},
		"filterableAttributes": []string{"search_type", "search_year", "search_status", "search_genres", "search_countries"},
		"sortableAttributes":   []string{"year", "modified.time", "updatedAt", "search_popularity", "search_quality", "search_year"},
		"displayedAttributes":  []string{"*"},
		"rankingRules":         []string{"words", "typo", "proximity", "attribute", "exactness", "search_popularity:desc", "search_year:desc", "search_quality:desc"},
		"typoTolerance": map[string]any{
			"enabled":             true,
			"minWordSizeForTypos": map[string]int{"oneTypo": 4, "twoTypos": 8},
		},
	}
	if err := m.requestJSON(ctx, http.MethodPatch, "/indexes/"+url.PathEscape(m.index)+"/settings", settings, nil, http.StatusAccepted, http.StatusOK); err != nil {
		return err
	}
	m.ready.Store(true)
	return nil
}

func (m *meiliSearchIndex) requestJSON(ctx context.Context, method, path string, input, output any, expected ...int) error {
	var body io.Reader
	if input != nil {
		encoded, err := json.Marshal(input)
		if err != nil {
			return err
		}
		body = bytes.NewReader(encoded)
	}
	request, err := http.NewRequestWithContext(ctx, method, m.baseURL+path, body)
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	if input != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if m.apiKey != "" {
		request.Header.Set("Authorization", "Bearer "+m.apiKey)
	}
	response, err := m.client.Do(request)
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
		return fmt.Errorf("meilisearch %s %s returned %d: %s", method, path, response.StatusCode, strings.TrimSpace(string(message)))
	}
	if output == nil || response.StatusCode == http.StatusNoContent {
		return nil
	}
	return json.NewDecoder(io.LimitReader(response.Body, 16*1024*1024)).Decode(output)
}

func meiliDocument(movie map[string]any) map[string]any {
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
	document := make(map[string]any, len(movie)+8)
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
	document["search_id"] = hex.EncodeToString(digest[:])
	document["search_aliases"] = aliases
	document["search_aliases_normalized"] = normalizedStrings(aliases)
	document["search_cast_normalized"] = normalizedStrings(cast)
	document["search_type"] = normalizedMovieType(firstString(movie["type"]))
	document["search_year"] = numberValue(movie["year"])
	document["search_status"] = normalizeText(firstString(movie["status"]))
	document["search_genres"] = normalizedNamedValues(movie["category"], movie["genre"])
	document["search_countries"] = normalizedNamedValues(movie["country"])
	document["search_popularity"] = maxInt(numberValue(movie["views"]), numberValue(movie["view"]))
	document["search_quality"] = movieQualityScore(movie)
	return document
}

func normalizedStrings(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if normalized := normalizeText(value); normalized != "" {
			result = append(result, normalized)
		}
	}
	return uniqueStrings(result)
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]bool, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" && !seen[value] {
			seen[value] = true
			result = append(result, value)
		}
	}
	return result
}

func movieQualityScore(movie map[string]any) int {
	quality := strings.ToLower(firstString(movie["quality"]))
	score := 1
	if strings.Contains(quality, "4k") || strings.Contains(quality, "2160") {
		score = 5
	} else if strings.Contains(quality, "fhd") || strings.Contains(quality, "1080") {
		score = 4
	} else if strings.Contains(quality, "hd") || strings.Contains(quality, "720") {
		score = 3
	}
	score += minInt(len(stringSet(movie["_sources"])), 3)
	return score
}

func (m *meiliSearchIndex) Status(ctx context.Context) meiliStatus {
	status := meiliStatus{Enabled: m != nil}
	if m == nil {
		return status
	}
	status.Ready = m.ready.Load()
	status.QueueDepth = len(m.queue)
	status.QueueCapacity = cap(m.queue)
	status.Indexed = m.indexed.Load()
	status.Deleted = m.deleted.Load()
	status.Dropped = m.dropped.Load()
	status.Failures = m.failures.Load()
	status.LastWriteAt = m.lastWriteAt.Load()
	var remote struct {
		NumberOfDocuments int `json:"numberOfDocuments"`
	}
	if m.canAttempt() && m.requestJSON(ctx, http.MethodGet, "/indexes/"+url.PathEscape(m.index)+"/stats", nil, &remote, http.StatusOK) == nil {
		status.Documents = remote.NumberOfDocuments
	}
	return status
}

func normalizedNamedValues(values ...any) []string {
	unique := make(map[string]bool)
	for _, value := range values {
		for _, entry := range namedValues(value) {
			if normalized := normalizeText(entry); normalized != "" {
				unique[normalized] = true
			}
		}
	}
	result := make([]string, 0, len(unique))
	for value := range unique {
		result = append(result, value)
	}
	return result
}

func meiliFilters(filters SearchFilters) []string {
	result := make([]string, 0, 5)
	if filters.Type != "" {
		result = append(result, "search_type = "+strconv.Quote(normalizedMovieType(filters.Type)))
	}
	if filters.Year > 0 {
		result = append(result, fmt.Sprintf("search_year = %d", filters.Year))
	}
	if filters.Status != "" {
		result = append(result, "search_status = "+strconv.Quote(normalizeText(filters.Status)))
	}
	if filters.Genre != "" {
		result = append(result, "search_genres = "+strconv.Quote(normalizeText(filters.Genre)))
	}
	if filters.Country != "" {
		result = append(result, "search_countries = "+strconv.Quote(normalizeText(filters.Country)))
	}
	return result
}
