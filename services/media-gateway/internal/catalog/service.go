package catalog

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/netphim/media-gateway/internal/config"
	"github.com/netphim/media-gateway/internal/security"
)

type Service struct {
	cfg        config.Config
	providers  []Provider
	client     *providerClient
	cache      Cache
	flights    jsonFlightGroup
	signer     *security.Signer
	search     *meiliSearchIndex
	searchCtx  context.Context
	searchEnd  context.CancelFunc
	searchWG   sync.WaitGroup
	tmdbClient *http.Client
	tmdbSlots  chan struct{}
}

type jsonFlight struct {
	done  chan struct{}
	value []byte
	err   error
}

type jsonFlightGroup struct {
	mu    sync.Mutex
	calls map[string]*jsonFlight
}

func (g *jsonFlightGroup) do(ctx context.Context, key string, fn func() ([]byte, error)) ([]byte, error, bool) {
	g.mu.Lock()
	if g.calls == nil {
		g.calls = make(map[string]*jsonFlight)
	}
	call, shared := g.calls[key]
	if !shared {
		call = &jsonFlight{done: make(chan struct{})}
		g.calls[key] = call
		go func() {
			call.value, call.err = fn()
			g.mu.Lock()
			delete(g.calls, key)
			close(call.done)
			g.mu.Unlock()
		}()
	}
	g.mu.Unlock()
	select {
	case <-ctx.Done():
		return nil, ctx.Err(), shared
	case <-call.done:
		return append([]byte(nil), call.value...), call.err, shared
	}
}

type providerResult struct {
	source  string
	payload map[string]any
	err     error
}

type SearchFilters struct {
	Type    string
	Genre   string
	Country string
	Year    int
	Status  string
}

func (filters SearchFilters) cacheKey() string {
	return fmt.Sprintf("%s:%s:%s:%d:%s", normalizeText(filters.Type), normalizeText(filters.Genre), normalizeText(filters.Country), filters.Year, normalizeText(filters.Status))
}

func (filters SearchFilters) active() bool {
	return filters.Type != "" || filters.Genre != "" || filters.Country != "" || filters.Year > 0 || filters.Status != ""
}

func New(cfg config.Config) *Service {
	tmdbConcurrency := cfg.TMDBArtworkConcurrency
	if tmdbConcurrency < 1 {
		tmdbConcurrency = 8
	}
	providers := []Provider{
		{Source: "kkphim", Origins: cfg.KKPhimOrigins},
		{Source: "ophim", Origins: cfg.OPhimOrigins},
		{Source: "nguonc", Origins: cfg.NguonCOrigins, Headers: map[string]string{"Referer": "https://phim.nguonc.com/", "Origin": "https://phim.nguonc.com"}},
		{Source: "vsmov", Origins: cfg.VSMovOrigins, Headers: map[string]string{"Referer": "https://vsmov.com/"}},
		{Source: "vicdn", Origins: cfg.ViCDNOrigins, Headers: map[string]string{"Referer": "https://vicdn.cc/", "Origin": "https://vicdn.cc"}},
	}
	var cache Cache = NewMemoryCache(600)
	if cfg.RedisURL != "" {
		if redisCache, err := NewRedisCache(cfg.RedisURL, 600); err == nil {
			cache = redisCache
		}
	}
	service := &Service{
		cfg: cfg, providers: providers,
		client: newProviderClient(cfg.CatalogTimeout, cfg.CatalogMaxBytes, providers),
		cache:  cache, signer: security.NewSigner(cfg.SigningSecret),
		search:     newMeiliSearchIndex(cfg),
		tmdbClient: &http.Client{Timeout: cfg.TMDBArtworkTimeout},
		tmdbSlots:  make(chan struct{}, tmdbConcurrency),
	}
	if service.search != nil {
		service.searchCtx, service.searchEnd = context.WithCancel(context.Background())
		service.searchWG.Add(1)
		go service.runSearchWarmup()
	}
	return service
}

func (s *Service) Close() error {
	if s.searchEnd != nil {
		s.searchEnd()
		s.searchWG.Wait()
	}
	if s.search != nil {
		s.search.Close()
	}
	s.client.close()
	return s.cache.Close()
}

func (s *Service) Register(router *gin.Engine, middleware ...gin.HandlerFunc) {
	group := router.Group("/v1")
	group.Use(middleware...)
	group.GET("/movies/:slug/bootstrap", s.bootstrapHandler)
	group.GET("/catalog", s.catalogHandler)
	group.GET("/home-feed", s.homeFeedHandler)
	group.GET("/search", s.searchHandler)
	group.GET("/top10", s.top10Handler)
	group.GET("/catalog/providers/health", s.healthHandler)
	group.GET("/search/status", s.searchStatusHandler)
	group.POST("/search/documents/delete", s.deleteSearchDocumentsHandler)
}

func (s *Service) homeFeedHandler(c *gin.Context) {
	startedAt := time.Now()
	limit := boundedQueryInt(c, "limit", 24, 8, 64)
	payload, cacheStatus, err := s.HomeFeed(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "home feed unavailable"})
		return
	}
	c.Header("Server-Timing", fmt.Sprintf("homefeed;dur=%.1f;desc=\"%s\"", float64(time.Since(startedAt).Microseconds())/1000, cacheStatus))
	writeJSON(c, payload, cacheStatus, int(s.cfg.CatalogHomeTTL.Seconds()))
}

func (s *Service) bootstrapHandler(c *gin.Context) {
	slug := cleanSlug(c.Param("slug"))
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid slug"})
		return
	}
	payload, cacheStatus, err := s.Bootstrap(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": false, "error": true, "message": "Không tìm thấy phim"})
		return
	}
	writeJSON(c, payload, cacheStatus, int(s.cfg.CatalogCacheTTL.Seconds()))
}

func (s *Service) catalogHandler(c *gin.Context) {
	kind := strings.ToLower(strings.TrimSpace(c.DefaultQuery("kind", "latest")))
	value := cleanValue(c.Query("value"), 80)
	page := boundedQueryInt(c, "page", 1, 1, 1000)
	limit := boundedQueryInt(c, "limit", 24, 1, 64)
	if !validCatalogKind(kind) || ((kind == "genre" || kind == "country" || kind == "filter") && value == "") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid catalog query"})
		return
	}
	payload, cacheStatus, err := s.Catalog(c.Request.Context(), kind, value, page, limit)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "catalog providers unavailable"})
		return
	}
	writeJSON(c, payload, cacheStatus, int(s.cfg.CatalogListTTL.Seconds()))
}

func (s *Service) searchHandler(c *gin.Context) {
	startedAt := time.Now()
	query := cleanValue(c.Query("q"), 120)
	page := boundedQueryInt(c, "page", 1, 1, 1000)
	limit := boundedQueryInt(c, "limit", 24, 1, 64)
	if len([]rune(query)) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search query is too short"})
		return
	}
	filters := SearchFilters{
		Type:    cleanValue(c.Query("type"), 32),
		Genre:   cleanValue(c.Query("genre"), 64),
		Country: cleanValue(c.Query("country"), 64),
		Year:    boundedQueryInt(c, "year", 0, 1900, time.Now().Year()+2),
		Status:  cleanValue(c.Query("status"), 32),
	}
	payload, cacheStatus, err := s.SearchFiltered(c.Request.Context(), query, page, limit, filters)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "search providers unavailable"})
		return
	}
	c.Header("Server-Timing", fmt.Sprintf("search;dur=%.1f;desc=\"%s\"", float64(time.Since(startedAt).Microseconds())/1000, cacheStatus))
	writeJSON(c, payload, cacheStatus, int(s.cfg.CatalogSearchTTL.Seconds()))
}

func (s *Service) top10Handler(c *gin.Context) {
	limit := boundedQueryInt(c, "limit", 10, 1, 30)
	payload, cacheStatus, err := s.Top10(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "top10 unavailable"})
		return
	}
	writeJSON(c, payload, cacheStatus, 60)
}

func (s *Service) healthHandler(c *gin.Context) {
	search := gin.H{"engine": "providers", "enabled": false, "ready": false}
	if s.search != nil {
		search = gin.H{"engine": "meilisearch", "enabled": true, "ready": s.search.ready.Load(), "fallback": "providers"}
	}
	c.JSON(http.StatusOK, gin.H{"providers": s.client.health(), "search": search})
}

func (s *Service) searchStatusHandler(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), s.cfg.MeiliTimeout)
	defer cancel()
	if s.search == nil {
		c.JSON(http.StatusOK, meiliStatus{Enabled: false})
		return
	}
	c.JSON(http.StatusOK, s.search.Status(ctx))
}

func (s *Service) deleteSearchDocumentsHandler(c *gin.Context) {
	if s.search == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "meilisearch is disabled"})
		return
	}
	provided := c.GetHeader("X-Internal-Token")
	if len(s.cfg.InternalToken) < 32 || subtle.ConstantTimeCompare([]byte(provided), []byte(s.cfg.InternalToken)) != 1 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var body struct {
		CanonicalKeys []string `json:"canonicalKeys"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || len(body.CanonicalKeys) == 0 || len(body.CanonicalKeys) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "canonicalKeys must contain 1..500 items"})
		return
	}
	s.search.DeleteCanonical(body.CanonicalKeys)
	c.JSON(http.StatusAccepted, gin.H{"queued": len(body.CanonicalKeys)})
}

func (s *Service) Bootstrap(ctx context.Context, slug string) (map[string]any, string, error) {
	cacheKey := "bootstrap:" + slug
	if payload, ok := s.readMapCache(ctx, cacheKey); ok {
		return payload, "HIT", nil
	}
	encoded, err, shared := s.flights.do(ctx, cacheKey, func() ([]byte, error) {
		if s.cfg.CoreAPIURL != "" {
			target := fmt.Sprintf("%s/movies/detail/%s", s.cfg.CoreAPIURL, url.PathEscape(slug))
			if payload, coreErr := s.fetchJSONObject(ctx, target); coreErr == nil {
				if movie := movieFromPayload(payload); movie != nil && firstString(movie["_source"]) == "manual" {
					value, marshalErr := json.Marshal(payload)
					if marshalErr == nil {
						s.cache.Set(context.Background(), cacheKey, value, s.cfg.CatalogCacheTTL)
					}
					return value, marshalErr
				}
			}
		}
		providers := s.collectProviders(ctx, func(fetchCtx context.Context, provider Provider) (map[string]any, error) {
			return s.fetchProvider(fetchCtx, provider, detailPath(provider.Source, slug), s.cfg.CatalogCacheTTL)
		})
		if len(providers) == 0 {
			return nil, errors.New("no movie provider returned a usable detail")
		}
		orderedSources := orderedProviderKeys(providers)
		primarySource := orderedSources[0]
		primary := providers[primarySource]
		movie := movieFromPayload(primary)
		if movie == nil {
			return nil, errors.New("movie payload is empty")
		}
		sourceSlugs := make(map[string]any)
		providerPayloads := make(map[string]any, len(providers))
		allEpisodes := make([]any, 0)
		for _, source := range orderedSources {
			payload := providers[source]
			providerPayloads[source] = payload
			if providerMovie := movieFromPayload(payload); providerMovie != nil {
				if providerSlug := firstString(providerMovie["slug"], slug); providerSlug != "" {
					sourceSlugs[source] = providerSlug
				}
			}
			for _, server := range episodesFromPayload(payload) {
				if record, ok := server.(map[string]any); ok {
					record["_source"] = source
				}
				allEpisodes = append(allEpisodes, server)
			}
		}
		movie["_source"] = primarySource
		movie["_sources"] = orderedSources
		movie["_sourceSlugs"] = sourceSlugs
		movie["_duplicateCount"] = len(orderedSources)
		s.enrichMovies(ctx, []map[string]any{movie})
		// Recommendations are below the player and are loaded separately by the
		// web client. Keeping this bootstrap focused on movie metadata and source
		// alternatives prevents a slow Core API request from delaying playback.
		recommendations := []any{}
		result := map[string]any{
			"status":          true,
			"movie":           movie,
			"episodes":        allEpisodes,
			"_providers":      providerPayloads,
			"_sources":        orderedSources,
			"_sourceSlugs":    sourceSlugs,
			"_primarySource":  primarySource,
			"_providerCount":  len(orderedSources),
			"recommendations": recommendations,
		}
		value, marshalErr := json.Marshal(result)
		if marshalErr == nil {
			ttl := s.cfg.CatalogCacheTTL
			if len(orderedSources) < 2 {
				ttl = 30 * time.Second
			}
			s.cache.Set(context.Background(), cacheKey, value, ttl)
		}
		return value, marshalErr
	})
	if err != nil {
		return nil, "MISS", err
	}
	var payload map[string]any
	if err := json.Unmarshal(encoded, &payload); err != nil {
		return nil, "MISS", err
	}
	if shared {
		return payload, "SHARED", nil
	}
	return payload, "MISS", nil
}

func (s *Service) Catalog(ctx context.Context, kind, value string, page, limit int) (map[string]any, string, error) {
	cacheKey := fmt.Sprintf("catalog:%s:%s:%d:%d", kind, value, page, limit)
	if payload, ok := s.readMapCache(ctx, cacheKey); ok {
		return payload, "HIT", nil
	}
	encoded, err, shared := s.flights.do(ctx, cacheKey, func() ([]byte, error) {
		providers := s.collectProviders(ctx, func(fetchCtx context.Context, provider Provider) (map[string]any, error) {
			path := catalogPath(provider.Source, kind, value, page, limit)
			if path == "" {
				return nil, errors.New("catalog kind unsupported by provider")
			}
			return s.fetchProvider(fetchCtx, provider, path, s.cfg.CatalogListTTL)
		})
		groups := make(map[string][]map[string]any)
		counts := make([]map[string]any, 0, len(providers))
		totalItems := 0
		totalPages := 0
		for source, payload := range providers {
			items := extractItems(payload)
			providerTotalItems, providerTotalPages := paginationTotals(payload)
			totalItems = maxInt(totalItems, providerTotalItems)
			totalPages = maxInt(totalPages, providerTotalPages)
			if len(items) > 0 {
				groups[source] = items
				counts = append(counts, map[string]any{"source": source, "count": len(items)})
			}
		}
		items := dedupeGroups(groups, 0)
		if kind == "filter" {
			filter := parseFilterValue(value)
			items = filterMovies(items, SearchFilters{
				Type: filter["type"], Genre: filter["category"], Country: filter["country"], Year: numberValue(filter["year"]),
			})
		}
		if len(items) == 0 && kind != "filter" {
			return nil, errors.New("catalog is empty")
		}
		searchItems := items
		if len(items) > limit {
			items = items[:limit]
		}
		s.enrichMovies(ctx, items)
		s.enqueueSearchItems(searchItems)
		minimumTotal := (page-1)*limit + len(items)
		if totalItems < minimumTotal {
			totalItems = minimumTotal
		}
		if totalPages == 0 {
			totalPages = page
			if len(items) == limit {
				totalPages++
			}
		}
		pagination := map[string]any{"currentPage": page, "totalItems": totalItems, "totalItemsPerPage": limit, "totalPages": maxInt(1, totalPages)}
		result := map[string]any{
			"status": true, "items": items, "params": map[string]any{"pagination": pagination},
			"pagination": pagination, "data": map[string]any{"items": items, "params": map[string]any{"pagination": pagination}},
			"_sources": counts, "_fast": true,
		}
		return s.encodeAndCache(cacheKey, result, s.cfg.CatalogListTTL)
	})
	return decodeMapResult(encoded, err, shared)
}

func (s *Service) Search(ctx context.Context, query string, page, limit int) (map[string]any, string, error) {
	return s.SearchFiltered(ctx, query, page, limit, SearchFilters{})
}

// HomeFeed collapses the homepage's critical catalogue fan-out into one
// cacheable response. A longer-lived stale snapshot is returned immediately
// while one coalesced background refresh rebuilds the fresh snapshot.
func (s *Service) HomeFeed(ctx context.Context, limit int) (map[string]any, string, error) {
	cacheKey := fmt.Sprintf("home-feed:%d", limit)
	if payload, ok := s.readMapCache(ctx, cacheKey); ok {
		return payload, "HIT", nil
	}
	if payload, ok := s.readMapCache(ctx, cacheKey+":stale"); ok {
		go s.refreshHomeFeed(limit)
		return payload, "STALE", nil
	}

	encoded, err, shared := s.flights.do(ctx, cacheKey, func() ([]byte, error) {
		return s.buildAndCacheHomeFeed(ctx, cacheKey, limit)
	})
	return decodeMapResult(encoded, err, shared)
}

func (s *Service) refreshHomeFeed(limit int) {
	cacheKey := fmt.Sprintf("home-feed:%d", limit)
	ctx, cancel := context.WithTimeout(context.Background(), maxDuration(12*time.Second, s.cfg.CatalogTimeout*3))
	defer cancel()
	_, _, _ = s.flights.do(ctx, cacheKey, func() ([]byte, error) {
		return s.buildAndCacheHomeFeed(ctx, cacheKey, limit)
	})
}

func (s *Service) buildAndCacheHomeFeed(ctx context.Context, cacheKey string, limit int) ([]byte, error) {
	type sectionResult struct {
		key   string
		items []any
		err   error
	}
	requests := []struct {
		key   string
		kind  string
		value string
	}{
		{key: "latest", kind: "latest"},
		{key: "series", kind: "series"},
		{key: "single", kind: "single"},
		{key: "anime", kind: "anime"},
		{key: "horror", kind: "genre", value: "kinh-di"},
		{key: "historical", kind: "genre", value: "co-trang"},
		{key: "theatrical", kind: "theatrical"},
	}
	results := make(chan sectionResult, len(requests))
	type top10Result struct {
		items []any
		err   error
	}
	top10Results := make(chan top10Result, 1)
	go func() {
		items, _, err := s.Top10(ctx, minInt(limit, 30))
		top10Results <- top10Result{items: items, err: err}
	}()
	for _, request := range requests {
		request := request
		go func() {
			payload, _, err := s.Catalog(ctx, request.kind, request.value, 1, limit)
			if err != nil {
				results <- sectionResult{key: request.key, err: err}
				return
			}
			results <- sectionResult{key: request.key, items: mapsToAny(extractItems(payload))}
		}()
	}

	sections := make(map[string]any, len(requests))
	succeeded := 0
	for range requests {
		result := <-results
		if result.err != nil || len(result.items) == 0 {
			sections[result.key] = []any{}
			continue
		}
		sections[result.key] = result.items
		succeeded++
	}

	top10ResultValue := <-top10Results
	top10, top10Err := top10ResultValue.items, top10ResultValue.err
	if top10Err != nil {
		top10 = []any{}
	} else if len(top10) > 0 {
		succeeded++
	}
	if succeeded == 0 {
		return nil, errors.New("home feed contains no usable sections")
	}

	// First-party uploads are authoritative and are prepended only after their
	// HLS source has been published by the core API.
	if s.cfg.CoreAPIURL != "" {
		target := fmt.Sprintf("%s/movies/published?limit=%d", s.cfg.CoreAPIURL, limit)
		if payload, fetchErr := s.fetchJSONArray(ctx, target); fetchErr == nil && len(payload) > 0 {
			manual := make([]map[string]any, 0, len(payload))
			for _, item := range payload {
				if movie, ok := item.(map[string]any); ok {
					manual = append(manual, movie)
				}
			}
			for _, sectionKey := range []string{"latest", "series", "single"} {
				selected := make([]map[string]any, 0, len(manual))
				for _, movie := range manual {
					mediaType := normalizeText(firstString(movie["type"]))
					if sectionKey == "latest" || (sectionKey == "series" && (mediaType == "series" || mediaType == "tvshows")) || (sectionKey == "single" && mediaType == "single") {
						selected = append(selected, movie)
					}
				}
				if len(selected) == 0 {
					continue
				}
				existing := make([]map[string]any, 0)
				if raw, ok := sections[sectionKey].([]any); ok {
					for _, item := range raw {
						if movie, ok := item.(map[string]any); ok {
							existing = append(existing, movie)
						}
					}
				}
				sections[sectionKey] = mapsToAny(dedupeGroups(map[string][]map[string]any{
					"manual": selected,
					"kkphim": existing,
				}, limit))
			}
		}
	}

	result := map[string]any{
		"status":      true,
		"generatedAt": time.Now().UTC().Format(time.RFC3339),
		"sections":    sections,
		"top10":       top10,
	}
	encoded, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	freshTTL := s.cfg.CatalogHomeTTL
	if freshTTL <= 0 {
		freshTTL = 5 * time.Minute
	}
	staleTTL := s.cfg.CatalogHomeStale
	if staleTTL <= freshTTL {
		staleTTL = freshTTL * 6
	}
	s.cache.Set(context.Background(), cacheKey, encoded, freshTTL)
	s.cache.Set(context.Background(), cacheKey+":stale", encoded, staleTTL)
	return encoded, nil
}

func maxDuration(left, right time.Duration) time.Duration {
	if left > right {
		return left
	}
	return right
}

func upstreamSearchLimit(limit int, filters SearchFilters) int {
	if filters.active() {
		return maxInt(limit, 64)
	}
	return limit
}

func (s *Service) SearchFiltered(ctx context.Context, query string, page, limit int, filters SearchFilters) (map[string]any, string, error) {
	cacheKey := fmt.Sprintf("search:%s:%s:%d:%d", normalizeText(query), filters.cacheKey(), page, limit)
	if payload, ok := s.readMapCache(ctx, cacheKey); ok {
		return payload, "HIT", nil
	}
	encoded, err, shared := s.flights.do(ctx, cacheKey, func() ([]byte, error) {
		manual := make([]map[string]any, 0)
		if s.cfg.CoreAPIURL != "" {
			target := fmt.Sprintf("%s/movies/published-search?keyword=%s&limit=%d", s.cfg.CoreAPIURL, url.QueryEscape(query), upstreamSearchLimit(limit, filters))
			if payload, fetchErr := s.fetchJSONArray(ctx, target); fetchErr == nil {
				for _, item := range payload {
					if movie, ok := item.(map[string]any); ok {
						manual = append(manual, movie)
					}
				}
			}
		}
		if len(manual) == 0 {
			if indexed, ok := s.searchIndexed(ctx, cacheKey, query, page, limit, filters); ok {
				return indexed, nil
			}
		}
		upstreamLimit := upstreamSearchLimit(limit, filters)
		providers, successfulProviders := s.collectSearchProviders(ctx, query, page, upstreamLimit)
		if successfulProviders == 0 && len(manual) == 0 {
			return nil, errors.New("no search provider responded")
		}
		groups := make(map[string][]map[string]any)
		counts := make([]map[string]any, 0, len(providers)+1)
		if len(manual) > 0 {
			groups["manual"] = manual
			counts = append(counts, map[string]any{"source": "manual", "count": len(manual)})
		}
		totalItems := 0
		totalPages := 0
		for source, payload := range providers {
			items := extractItems(payload)
			providerTotalItems, providerTotalPages := paginationTotals(payload)
			if providerTotalItems > totalItems {
				totalItems = providerTotalItems
			}
			if providerTotalPages > totalPages {
				totalPages = providerTotalPages
			}
			counts = append(counts, map[string]any{"source": source, "count": len(items)})
			if len(items) > 0 {
				groups[source] = items
			}
		}
		items := dedupeGroups(groups, 0)
		items = filterMovies(items, filters)
		items = rankSearch(items, query)
		searchItems := items
		mergedTotal := len(items)
		if len(items) > limit {
			items = items[:limit]
		}
		s.enrichMovies(ctx, items)
		s.enqueueSearchItems(searchItems)
		minimumTotal := (page-1)*limit + len(items)
		if totalItems < minimumTotal {
			totalItems = minimumTotal
		}
		if totalPages == 0 {
			totalPages = page
			if len(items) == limit {
				totalPages++
			}
		}
		pagination := map[string]any{"currentPage": page, "totalItems": totalItems, "totalItemsPerPage": limit, "totalPages": maxInt(1, totalPages)}
		result := map[string]any{
			"status": "success", "data": map[string]any{"items": mapsToAny(items), "params": map[string]any{"pagination": pagination}},
			"_sources": counts, "_totalMerged": mergedTotal, "_query": map[string]any{"original": query, "filters": filters},
			"_engine": "go-providers",
		}
		ttl := s.cfg.CatalogSearchTTL
		if len(items) == 0 && ttl > 30*time.Second {
			ttl = 30 * time.Second
		}
		return s.encodeAndCache(cacheKey, result, ttl)
	})
	return decodeMapResult(encoded, err, shared)
}

func (s *Service) enqueueSearchItems(items []map[string]any) {
	if s.search != nil && len(items) > 0 {
		s.search.Enqueue(items)
	}
}

func (s *Service) searchIndexed(ctx context.Context, cacheKey, query string, page, limit int, filters SearchFilters) ([]byte, bool) {
	if s.search == nil {
		return nil, false
	}
	response, err := s.search.Search(ctx, query, page, limit, filters)
	if err != nil || len(response.Hits) == 0 {
		return nil, false
	}
	items := filterMovies(response.Hits, filters)
	items = rankSearch(items, query)
	if len(items) == 0 {
		return nil, false
	}
	if len(items) > limit {
		items = items[:limit]
	}
	s.enrichMovies(ctx, items)
	total := response.EstimatedTotalHits
	if total < (page-1)*limit+len(items) {
		total = (page-1)*limit + len(items)
	}
	totalPages := maxInt(1, (total+limit-1)/limit)
	pagination := map[string]any{"currentPage": page, "totalItems": total, "totalItemsPerPage": limit, "totalPages": totalPages}
	result := map[string]any{
		"status":       "success",
		"data":         map[string]any{"items": mapsToAny(items), "params": map[string]any{"pagination": pagination}},
		"_sources":     []map[string]any{{"source": "meilisearch", "count": len(items)}},
		"_totalMerged": len(items), "_query": map[string]any{"original": query, "filters": filters},
		"_engine": "meilisearch", "_processingTimeMs": response.ProcessingTimeMS,
	}
	encoded, err := s.encodeAndCache(cacheKey, result, s.cfg.CatalogSearchTTL)
	return encoded, err == nil
}

func (s *Service) runSearchWarmup() {
	defer s.searchWG.Done()
	// Give the HTTP service time to become ready before background provider work.
	timer := time.NewTimer(2 * time.Second)
	defer timer.Stop()
	select {
	case <-s.searchCtx.Done():
		return
	case <-timer.C:
	}
	// Fast initial coverage makes search useful shortly after startup. A full
	// snapshot follows immediately so a fresh deployment does not need to wait
	// until the daily maintenance window for complete keyword coverage.
	s.syncSearchIndex(s.searchCtx, s.cfg.MeiliWarmPages, 0, false)
	s.syncSearchIndex(s.searchCtx, s.cfg.MeiliFullSyncPages, s.cfg.MeiliSyncPause, true)
	incrementalTimer := time.NewTimer(s.cfg.MeiliSyncInterval)
	fullTimer := time.NewTimer(s.cfg.MeiliFullSyncInterval)
	defer incrementalTimer.Stop()
	defer fullTimer.Stop()
	for {
		select {
		case <-s.searchCtx.Done():
			return
		case <-incrementalTimer.C:
			s.syncSearchIndex(s.searchCtx, s.cfg.MeiliSyncPages, s.cfg.MeiliSyncPause, false)
			incrementalTimer.Reset(s.cfg.MeiliSyncInterval)
		case <-fullTimer.C:
			s.syncSearchIndex(s.searchCtx, s.cfg.MeiliFullSyncPages, s.cfg.MeiliSyncPause, true)
			fullTimer.Reset(s.cfg.MeiliFullSyncInterval)
		}
	}
}

func (s *Service) syncSearchIndex(ctx context.Context, pages int, pause time.Duration, requestPrune bool) {
	if s.search == nil || pages < 1 {
		return
	}
	byCanonical := make(map[string]map[string]any)
	aliasToCanonical := make(map[string]string)
	order := make([]string, 0, pages*64)
	completeSnapshot := true
	rank := 0
	for _, kind := range []string{"latest", "series", "single", "anime"} {
		kindComplete := false
		for page := 1; page <= pages; page++ {
			if ctx.Err() != nil {
				return
			}
			payload, _, err := s.Catalog(ctx, kind, "", page, 64)
			if err != nil {
				completeSnapshot = false
				break
			}
			items := extractItems(payload)
			for _, item := range items {
				key := firstString(item["_canonicalKey"])
				if key == "" {
					key = canonicalKey(item, firstString(item["name"], item["title"]), firstString(item["origin_name"], item["original_name"]), numberValue(item["year"]))
					item["_canonicalKey"] = key
				}
				aliases := canonicalAliases(item)
				for _, alias := range aliases {
					if existingKey := aliasToCanonical[alias]; existingKey != "" {
						key = existingKey
						break
					}
				}
				if existing := byCanonical[key]; existing != nil {
					mergeFilm(existing, item)
				} else {
					item["_rank"] = rank
					rank++
					byCanonical[key] = item
					order = append(order, key)
				}
				for _, alias := range aliases {
					aliasToCanonical[alias] = key
				}
			}

			_, totalPages := paginationTotals(payload)
			if len(items) == 0 || (totalPages > 0 && page >= totalPages) {
				kindComplete = true
				break
			}
			if pause > 0 {
				timer := time.NewTimer(pause)
				select {
				case <-ctx.Done():
					timer.Stop()
					return
				case <-timer.C:
				}
			}
		}
		if !kindComplete {
			completeSnapshot = false
		}
	}

	snapshot := make([]map[string]any, 0, len(order))
	for _, key := range order {
		if item := byCanonical[key]; item != nil {
			snapshot = append(snapshot, item)
		}
	}
	if len(snapshot) == 0 || ctx.Err() != nil {
		return
	}
	prune := requestPrune && completeSnapshot && s.cfg.MeiliPruneStale
	_ = s.search.SyncSnapshot(ctx, snapshot, prune)
}

// collectSearchProviders is deliberately separate from collectProviders:
// an empty search response is valid and should not trip the provider circuit.
// It also returns as soon as two providers have supplied enough candidates,
// while slower providers can enrich narrow searches for a short grace period.
func (s *Service) collectSearchProviders(parent context.Context, query string, page, limit int) (map[string]map[string]any, int) {
	ctx, cancel := context.WithTimeout(parent, s.cfg.CatalogTimeout)
	defer cancel()

	searchable := make([]Provider, 0, len(s.providers))
	for _, provider := range s.providers {
		if searchPath(provider.Source, query, page, limit) != "" {
			searchable = append(searchable, provider)
		}
	}
	results := make(chan providerResult, len(searchable))
	for _, provider := range searchable {
		provider := provider
		go func() {
			path := searchPath(provider.Source, query, page, limit)
			payload, err := s.fetchProvider(ctx, provider, path, s.cfg.CatalogSearchTTL)
			results <- providerResult{source: provider.Source, payload: payload, err: err}
		}()
	}

	collected := make(map[string]map[string]any)
	remaining := len(searchable)
	successful := 0
	candidates := 0
	var enrichment <-chan time.Time
	var timer *time.Timer
	defer func() {
		if timer != nil {
			timer.Stop()
		}
	}()
	for remaining > 0 {
		select {
		case <-ctx.Done():
			return collected, successful
		case <-enrichment:
			return collected, successful
		case result := <-results:
			remaining--
			if result.err != nil || result.payload == nil {
				continue
			}
			collected[result.source] = result.payload
			successful++
			candidates += len(extractItems(result.payload))
			// Do not let one fast empty provider hide valid results from a
			// slightly slower source. The grace window starts only after the
			// first usable candidate arrives.
			if timer == nil && candidates > 0 {
				timer = time.NewTimer(350 * time.Millisecond)
				enrichment = timer.C
			}
			if successful >= 2 && candidates >= limit {
				return collected, successful
			}
		}
	}
	return collected, successful
}

func (s *Service) Top10(ctx context.Context, limit int) ([]any, string, error) {
	cacheKey := fmt.Sprintf("top10:%d", limit)
	if encoded, ok := s.cache.Get(ctx, cacheKey); ok {
		var payload []any
		if json.Unmarshal(encoded, &payload) == nil {
			return payload, "HIT", nil
		}
	}
	if s.cfg.CoreAPIURL != "" {
		target := fmt.Sprintf("%s/movies/trending?limit=%d", s.cfg.CoreAPIURL, limit)
		if payload, err := s.fetchJSONArray(ctx, target); err == nil && len(payload) > 0 {
			movies := make([]map[string]any, 0, len(payload))
			for _, item := range payload {
				if movie, ok := item.(map[string]any); ok {
					movies = append(movies, movie)
				}
			}
			s.enrichMovies(ctx, movies)
			encoded, _ := json.Marshal(payload)
			s.cache.Set(context.Background(), cacheKey, encoded, time.Minute)
			return payload, "MISS-ANALYTICS", nil
		}
	}
	catalogPayload, _, err := s.Catalog(ctx, "latest", "", 1, maxInt(limit*3, 24))
	if err != nil {
		return nil, "MISS", err
	}
	items, _ := catalogPayload["items"].([]any)
	if len(items) > limit {
		items = items[:limit]
	}
	encoded, _ := json.Marshal(items)
	s.cache.Set(context.Background(), cacheKey, encoded, time.Minute)
	return items, "MISS-FALLBACK", nil
}

func (s *Service) collectProviders(parent context.Context, operation func(context.Context, Provider) (map[string]any, error)) map[string]map[string]any {
	ctx, cancel := context.WithTimeout(parent, s.cfg.CatalogTimeout)
	defer cancel()
	results := make(chan providerResult, len(s.providers))
	for _, provider := range s.providers {
		provider := provider
		go func() {
			payload, err := operation(ctx, provider)
			if err == nil && movieFromPayload(payload) == nil && len(extractItems(payload)) == 0 {
				err = errors.New("provider payload is empty")
			}
			results <- providerResult{source: provider.Source, payload: payload, err: err}
		}()
	}
	collected := make(map[string]map[string]any)
	remaining := len(s.providers)
	var enrichment <-chan time.Time
	var timer *time.Timer
	defer func() {
		if timer != nil {
			timer.Stop()
		}
	}()
	for remaining > 0 {
		select {
		case <-ctx.Done():
			return collected
		case <-enrichment:
			return collected
		case result := <-results:
			remaining--
			if result.err == nil && result.payload != nil {
				collected[result.source] = result.payload
				if timer == nil {
					timer = time.NewTimer(s.cfg.CatalogEnrichmentWindow)
					enrichment = timer.C
				}
			}
		}
	}
	return collected
}

func (s *Service) fetchProvider(ctx context.Context, provider Provider, path string, ttl time.Duration) (map[string]any, error) {
	key := provider.Source + ":" + path
	if payload, ok := s.readMapCache(ctx, key); ok {
		return payload, nil
	}
	encoded, err, _ := s.flights.do(ctx, key, func() ([]byte, error) {
		payload, fetchErr := s.client.fetch(ctx, provider, path)
		if fetchErr != nil {
			return nil, fetchErr
		}
		payload = normalizePayload(provider.Source, payload)
		s.addSignedHLSFallbacks(payload)
		value, marshalErr := json.Marshal(payload)
		if marshalErr == nil {
			s.cache.Set(context.Background(), key, value, ttl)
		}
		return value, marshalErr
	})
	if err != nil {
		return nil, err
	}
	var payload map[string]any
	if err := json.Unmarshal(encoded, &payload); err != nil {
		return nil, err
	}
	return payload, nil
}

func (s *Service) addSignedHLSFallbacks(value any) {
	switch typed := value.(type) {
	case []any:
		for _, child := range typed {
			s.addSignedHLSFallbacks(child)
		}
	case map[string]any:
		if rawURL, ok := typed["link_m3u8"].(string); ok && (strings.HasPrefix(rawURL, "https://") || strings.HasPrefix(rawURL, "http://")) {
			typed["link_m3u8_proxy"] = s.signer.SignedProxyURL(rawURL)
		}
		for _, child := range typed {
			s.addSignedHLSFallbacks(child)
		}
	}
}

func (s *Service) readMapCache(ctx context.Context, key string) (map[string]any, bool) {
	encoded, ok := s.cache.Get(ctx, key)
	if !ok {
		return nil, false
	}
	var payload map[string]any
	if json.Unmarshal(encoded, &payload) != nil {
		return nil, false
	}
	return payload, true
}

func (s *Service) encodeAndCache(key string, payload map[string]any, ttl time.Duration) ([]byte, error) {
	encoded, err := json.Marshal(payload)
	if err == nil {
		s.cache.Set(context.Background(), key, encoded, ttl)
	}
	return encoded, err
}

func (s *Service) fetchJSONArray(ctx context.Context, target string) ([]any, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}
	response, err := s.client.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("analytics status %d", response.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, s.cfg.CatalogMaxBytes+1))
	if err != nil || int64(len(body)) > s.cfg.CatalogMaxBytes {
		return nil, errors.New("analytics response unavailable")
	}
	var payload []any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	return payload, nil
}

func (s *Service) fetchJSONObject(ctx context.Context, target string) (map[string]any, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}
	response, err := s.client.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("core API status %d", response.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, s.cfg.CatalogMaxBytes+1))
	if err != nil || int64(len(body)) > s.cfg.CatalogMaxBytes {
		return nil, errors.New("core API response unavailable")
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	return payload, nil
}

func detailPath(source, slug string) string {
	slug = url.PathEscape(slug)
	switch source {
	case "kkphim", "ophim", "vsmov":
		return "phim/" + slug
	case "nguonc":
		return "film/" + slug
	case "vicdn":
		return "info/" + slug
	default:
		return ""
	}
}

func catalogPath(source, kind, value string, page, limit int) string {
	query := fmt.Sprintf("page=%d&limit=%d", page, limit)
	escaped := url.PathEscape(value)
	switch source {
	case "kkphim", "ophim":
		switch kind {
		case "latest":
			return "danh-sach/phim-moi-cap-nhat?page=" + strconv.Itoa(page)
		case "series", "single", "anime", "tvshows":
			slug := map[string]string{"series": "phim-bo", "single": "phim-le", "anime": "hoat-hinh", "tvshows": "tv-shows"}[kind]
			return "v1/api/danh-sach/" + slug + "?" + query
		case "genre":
			return "v1/api/the-loai/" + escaped + "?" + query
		case "country":
			return "v1/api/quoc-gia/" + escaped + "?" + query
		case "theatrical":
			return "v1/api/danh-sach/phim-chieu-rap?" + query
		case "filter":
			values := filterValues(value, page, limit)
			return "v1/api/danh-sach?" + values.Encode()
		}
	case "nguonc":
		switch kind {
		case "latest":
			return "films/phim-moi-cap-nhat?page=" + strconv.Itoa(page)
		case "series", "single", "tvshows", "anime":
			slug := map[string]string{"series": "phim-bo", "single": "phim-le", "anime": "hoat-hinh", "tvshows": "tv-shows"}[kind]
			return "films/danh-sach/" + slug + "?page=" + strconv.Itoa(page)
		case "genre":
			if value == "vien-tuong" {
				escaped = "khoa-hoc-vien-tuong"
			}
			return "films/the-loai/" + escaped + "?page=" + strconv.Itoa(page)
		case "country":
			return "films/quoc-gia/" + escaped + "?page=" + strconv.Itoa(page)
		case "theatrical":
			return "films/danh-sach/phim-chieu-rap?page=" + strconv.Itoa(page)
		case "filter":
			filter := parseFilterValue(value)
			if filter["category"] != "" {
				return "films/the-loai/" + url.PathEscape(filter["category"]) + "?page=" + strconv.Itoa(page)
			}
			if filter["country"] != "" {
				return "films/quoc-gia/" + url.PathEscape(filter["country"]) + "?page=" + strconv.Itoa(page)
			}
			if filter["type"] != "" {
				return "films/danh-sach/" + url.PathEscape(providerTypeSlug(filter["type"])) + "?page=" + strconv.Itoa(page)
			}
		}
	case "vsmov":
		switch kind {
		case "latest":
			return "danh-sach/phim-moi-cap-nhat?page=" + strconv.Itoa(page)
		case "series", "single", "anime", "tvshows":
			slug := map[string]string{"series": "phim-bo", "single": "phim-le", "anime": "hoat-hinh", "tvshows": "tv-shows"}[kind]
			return "danh-sach/" + slug + "?page=" + strconv.Itoa(page)
		case "genre":
			return "the-loai/" + escaped + "?page=" + strconv.Itoa(page)
		case "country":
			return "quoc-gia/" + escaped + "?page=" + strconv.Itoa(page)
		case "theatrical":
			return "danh-sach/phim-chieu-rap?page=" + strconv.Itoa(page)
		case "filter":
			filter := parseFilterValue(value)
			if filter["category"] != "" {
				return "the-loai/" + url.PathEscape(filter["category"]) + "?page=" + strconv.Itoa(page)
			}
			if filter["country"] != "" {
				return "quoc-gia/" + url.PathEscape(filter["country"]) + "?page=" + strconv.Itoa(page)
			}
			if filter["type"] != "" {
				return "danh-sach/" + url.PathEscape(providerTypeSlug(filter["type"])) + "?page=" + strconv.Itoa(page)
			}
		}
	case "vicdn":
		if kind == "latest" {
			return "update/" + strconv.Itoa(page)
		}
		if kind == "anime" {
			return "type/hoat-hinh/" + strconv.Itoa(page)
		}
		if kind == "genre" {
			return "type/" + escaped + "/" + strconv.Itoa(page)
		}
	}
	return ""
}

func searchPath(source, query string, page, limit int) string {
	values := url.Values{"keyword": {query}, "page": {strconv.Itoa(page)}, "limit": {strconv.Itoa(limit)}}
	switch source {
	case "kkphim":
		return "v1/api/tim-kiem?" + values.Encode()
	case "ophim", "vsmov":
		return "tim-kiem?" + values.Encode()
	case "nguonc":
		return "films/search?" + values.Encode()
	default:
		return ""
	}
}

func rankSearch(items []map[string]any, query string) []map[string]any {
	normalizedQuery := normalizeText(query)
	queryTokens := strings.Fields(normalizedQuery)
	queryVariants := queryAliases(query)
	if len(queryVariants) == 0 {
		queryVariants = []string{normalizedQuery}
	}
	type scoredItem struct {
		item     map[string]any
		score    int
		relevant bool
	}
	scored := make([]scoredItem, 0, len(items))
	hasRelevant := false
	for _, item := range items {
		name := normalizeText(firstString(item["name"]))
		origin := normalizeText(firstString(item["origin_name"]))
		aliases := movieSearchAliases(item)
		titleTargets := uniqueStrings(append([]string{name, origin, compactSearchText(name), compactSearchText(origin)}, aliases...))
		metadata := normalizeText(strings.Join(append(namedValues(item["actor"]), namedValues(item["director"])...), " "))
		targetTokens := strings.Fields(strings.TrimSpace(strings.Join(titleTargets, " ") + " " + metadata))
		value := 0
		relevant := false
		bestTextScore := 0
		for _, variant := range queryVariants {
			variant = normalizeText(variant)
			compactVariant := compactSearchText(variant)
			for _, target := range titleTargets {
				textScore := 0
				switch {
				case target == variant || target == compactVariant:
					textScore = 2000
				case strings.HasPrefix(target, variant) || strings.HasPrefix(target, compactVariant):
					textScore = 1000
				case strings.Contains(target, variant) || strings.Contains(target, compactVariant):
					textScore = 500
				}
				if textScore > bestTextScore {
					bestTextScore = textScore
				}
			}
		}
		if bestTextScore > 0 {
			value += bestTextScore
			relevant = true
		}
		matchedTokens := 0
		for _, token := range queryTokens {
			matched := false
			for _, target := range targetTokens {
				if target == token || (len(token) >= 4 && strings.HasPrefix(target, token)) || (len(target) >= 4 && strings.HasPrefix(token, target)) {
					matched = true
					break
				}
			}
			if matched {
				matchedTokens++
				value += 80
			}
		}
		if len(queryTokens) > 0 && matchedTokens == len(queryTokens) {
			relevant = true
			value += 300
		}
		value += minInt(numberValue(item["_duplicateCount"])*30, 120)
		year := numberValue(item["year"])
		if year > 2000 {
			value += minInt(year-2000, 30)
		}
		scored = append(scored, scoredItem{item: item, score: value, relevant: relevant})
		hasRelevant = hasRelevant || relevant
	}
	sort.SliceStable(scored, func(i, j int) bool {
		if scored[i].score == scored[j].score {
			return numberValue(scored[i].item["_rank"]) < numberValue(scored[j].item["_rank"])
		}
		return scored[i].score > scored[j].score
	})
	result := make([]map[string]any, 0, len(scored))
	for _, candidate := range scored {
		if !hasRelevant || candidate.relevant {
			result = append(result, candidate.item)
		}
	}
	return result
}

func filterMovies(items []map[string]any, filters SearchFilters) []map[string]any {
	if !filters.active() {
		return items
	}
	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if filters.Year > 0 && numberValue(item["year"]) != filters.Year {
			continue
		}
		if filters.Type != "" && normalizedMovieType(firstString(item["type"])) != normalizedMovieType(filters.Type) {
			continue
		}
		if filters.Genre != "" && !matchesNamedValue(item["category"], filters.Genre) && !matchesNamedValue(item["genre"], filters.Genre) {
			continue
		}
		if filters.Country != "" && !matchesNamedValue(item["country"], filters.Country) {
			continue
		}
		if filters.Status != "" && normalizeText(firstString(item["status"])) != normalizeText(filters.Status) {
			continue
		}
		result = append(result, item)
	}
	return result
}

func normalizedMovieType(value string) string {
	switch normalizeText(value) {
	case "single", "phim le", "movie", "movies":
		return "single"
	case "series", "phim bo", "tv", "tv series":
		return "series"
	case "anime", "hoat hinh", "hoathinh", "animation":
		return "anime"
	case "tvshows", "tv shows", "shows":
		return "tvshows"
	default:
		return normalizeText(value)
	}
}

func namedValues(value any) []string {
	values, ok := value.([]any)
	if !ok {
		if text := firstString(value); text != "" {
			return []string{text}
		}
		return nil
	}
	result := make([]string, 0, len(values))
	for _, raw := range values {
		if record, ok := raw.(map[string]any); ok {
			if text := firstString(record["slug"], record["name"], record["title"]); text != "" {
				result = append(result, text)
			}
		} else if text := firstString(raw); text != "" {
			result = append(result, text)
		}
	}
	return result
}

func matchesNamedValue(value any, expected string) bool {
	expected = normalizeText(expected)
	for _, candidate := range namedValues(value) {
		candidate = normalizeText(candidate)
		if candidate == expected || strings.Contains(candidate, expected) || strings.Contains(expected, candidate) {
			return true
		}
	}
	return false
}

func paginationTotals(payload map[string]any) (int, int) {
	candidates := []map[string]any{payload}
	if data, ok := payload["data"].(map[string]any); ok {
		candidates = append(candidates, data)
		if params, ok := data["params"].(map[string]any); ok {
			candidates = append(candidates, params)
			if pagination, ok := params["pagination"].(map[string]any); ok {
				candidates = append(candidates, pagination)
			}
		}
	}
	for _, key := range []string{"pagination", "paginate"} {
		if value, ok := payload[key].(map[string]any); ok {
			candidates = append(candidates, value)
		}
	}
	totalItems, totalPages := 0, 0
	for _, candidate := range candidates {
		for _, key := range []string{"totalItems", "total_items", "total_records", "total"} {
			totalItems = maxInt(totalItems, numberValue(candidate[key]))
		}
		for _, key := range []string{"totalPages", "total_pages", "total_page", "pageRanges"} {
			totalPages = maxInt(totalPages, numberValue(candidate[key]))
		}
	}
	return totalItems, totalPages
}

func mapsToAny(items []map[string]any) []any {
	result := make([]any, len(items))
	for index, item := range items {
		result[index] = item
	}
	return result
}

func orderedProviderKeys(providers map[string]map[string]any) []string {
	keys := make([]string, 0, len(providers))
	for source := range providers {
		keys = append(keys, source)
	}
	sort.Slice(keys, func(i, j int) bool { return sourcePriority[keys[i]] < sourcePriority[keys[j]] })
	return keys
}

func decodeMapResult(encoded []byte, err error, shared bool) (map[string]any, string, error) {
	if err != nil {
		return nil, "MISS", err
	}
	var payload map[string]any
	if err := json.Unmarshal(encoded, &payload); err != nil {
		return nil, "MISS", err
	}
	if shared {
		return payload, "SHARED", nil
	}
	return payload, "MISS", nil
}

func writeJSON(c *gin.Context, payload any, cacheStatus string, ttl int) {
	c.Header("X-NetPhim-Catalog-Cache", cacheStatus)
	c.Header("Cache-Control", fmt.Sprintf("public, max-age=30, s-maxage=%d, stale-while-revalidate=%d", ttl, maxInt(ttl*4, 300)))
	// Compute ETag from the JSON body for conditional request support.
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		c.JSON(http.StatusOK, payload)
		return
	}
	sum := sha256.Sum256(bodyBytes)
	etag := `"` + hex.EncodeToString(sum[:8]) + `"`
	c.Header("ETag", etag)
	if c.GetHeader("If-None-Match") == etag {
		c.Status(http.StatusNotModified)
		return
	}
	c.Data(http.StatusOK, "application/json; charset=utf-8", bodyBytes)
}

func cleanSlug(value string) string {
	value = strings.TrimSpace(value)
	if len(value) == 0 || len(value) > 180 {
		return ""
	}
	for _, character := range value {
		if !(character == '-' || character == '_' || character == '.' || character >= '0' && character <= '9' || character >= 'a' && character <= 'z' || character >= 'A' && character <= 'Z') {
			return ""
		}
	}
	return value
}

func cleanValue(value string, maximum int) string {
	value = strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
	if len([]rune(value)) > maximum {
		return ""
	}
	return value
}

func boundedQueryInt(c *gin.Context, key string, fallback, minimum, maximum int) int {
	value, err := strconv.Atoi(c.Query(key))
	if err != nil || value < minimum || value > maximum {
		return fallback
	}
	return value
}

func validCatalogKind(kind string) bool {
	switch kind {
	case "latest", "series", "single", "anime", "tvshows", "genre", "country", "filter", "theatrical":
		return true
	default:
		return false
	}
}

func parseFilterValue(value string) map[string]string {
	result := map[string]string{"type": "", "category": "", "country": "", "year": ""}
	parts := strings.Split(value, "|")
	keys := []string{"type", "category", "country", "year"}
	for index, key := range keys {
		if index < len(parts) {
			result[key] = strings.TrimSpace(parts[index])
		}
	}
	return result
}

func filterValues(value string, page, limit int) url.Values {
	filter := parseFilterValue(value)
	values := url.Values{"page": {strconv.Itoa(page)}, "limit": {strconv.Itoa(limit)}}
	for _, key := range []string{"type", "category", "country", "year"} {
		if filter[key] != "" {
			fieldValue := filter[key]
			if key == "type" {
				fieldValue = providerTypeSlug(fieldValue)
			}
			values.Set(key, fieldValue)
		}
	}
	values.Set("sort_field", "modified.time")
	values.Set("sort_type", "desc")
	return values
}

func providerTypeSlug(value string) string {
	switch normalizedMovieType(value) {
	case "single":
		return "phim-le"
	case "series":
		return "phim-bo"
	case "anime":
		return "hoat-hinh"
	case "tvshows":
		return "tv-shows"
	default:
		return value
	}
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}
	return right
}

func minInt(left, right int) int {
	if left < right {
		return left
	}
	return right
}
