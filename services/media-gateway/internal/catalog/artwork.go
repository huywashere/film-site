package catalog

import (
	"context"
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
)

const tmdbImageBaseURL = "https://image.tmdb.org/t/p"

type tmdbArtworkRecord struct {
	ID           int    `json:"id"`
	MediaType    string `json:"mediaType"`
	PosterPath   string `json:"poster_path,omitempty"`
	BackdropPath string `json:"backdrop_path,omitempty"`
	LogoPath     string `json:"logo_path,omitempty"`
}

type tmdbImage struct {
	FilePath string  `json:"file_path"`
	Language *string `json:"iso_639_1"`
	Width    int     `json:"width"`
	Vote     float64 `json:"vote_average"`
}

type tmdbDetailResponse struct {
	ID           int    `json:"id"`
	PosterPath   string `json:"poster_path"`
	BackdropPath string `json:"backdrop_path"`
	Images       struct {
		Logos []tmdbImage `json:"logos"`
	} `json:"images"`
}

type tmdbSearchItem struct {
	ID            int     `json:"id"`
	MediaType     string  `json:"media_type"`
	Title         string  `json:"title"`
	Name          string  `json:"name"`
	OriginalTitle string  `json:"original_title"`
	OriginalName  string  `json:"original_name"`
	ReleaseDate   string  `json:"release_date"`
	FirstAirDate  string  `json:"first_air_date"`
	Popularity    float64 `json:"popularity"`
}

type tmdbSearchResponse struct {
	Results []tmdbSearchItem `json:"results"`
}

func (s *Service) tmdbEnabled() bool {
	return strings.TrimSpace(s.cfg.TMDBAccessToken) != "" || strings.TrimSpace(s.cfg.TMDBAPIKey) != ""
}

// enrichMovies adds a complete, size-aware artwork payload before catalog data
// reaches clients. It is best effort: provider artwork remains available if
// TMDB is disabled, slow, rate limited, or has no confident match.
func (s *Service) enrichMovies(ctx context.Context, movies []map[string]any) {
	if !s.tmdbEnabled() || len(movies) == 0 {
		return
	}
	// Bound the whole batch, not every queued item. A cold TMDB cache must never
	// turn one catalogue response into N sequential timeout windows.
	batchTimeout := s.cfg.TMDBArtworkTimeout
	if batchTimeout <= 0 {
		batchTimeout = 2500 * time.Millisecond
	}
	batchCtx, cancel := context.WithTimeout(ctx, batchTimeout)
	defer cancel()

	var wg sync.WaitGroup
	for _, movie := range movies {
		if movie == nil {
			continue
		}
		movie := movie
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case s.tmdbSlots <- struct{}{}:
				defer func() { <-s.tmdbSlots }()
			case <-batchCtx.Done():
				return
			}
			record, err := s.resolveTMDBArtwork(batchCtx, movie)
			if err == nil && record != nil {
				applyTMDBArtwork(movie, *record)
			}
		}()
	}
	wg.Wait()
}

func (s *Service) resolveTMDBArtwork(ctx context.Context, movie map[string]any) (*tmdbArtworkRecord, error) {
	mediaType, tmdbID := movieTMDBIdentity(movie)
	identity := ""
	if tmdbID > 0 {
		identity = fmt.Sprintf("%s:%d", mediaType, tmdbID)
	} else {
		title := firstString(movie["origin_name"], movie["name"], movie["title"])
		if title == "" {
			return nil, errors.New("movie has no TMDB identity")
		}
		identity = fmt.Sprintf("search:%s:%s:%d", mediaType, normalizeText(stripSeasonSuffix(title)), numberValue(movie["year"]))
	}
	cacheKey := "tmdb-artwork:" + identity
	if cached, found, ok := s.readTMDBArtworkCache(ctx, cacheKey); ok {
		if !found {
			return nil, errors.New("cached TMDB artwork miss")
		}
		return cached, nil
	}

	encoded, err, _ := s.flights.do(ctx, cacheKey, func() ([]byte, error) {
		if cached, found, ok := s.readTMDBArtworkCache(ctx, cacheKey); ok {
			if !found {
				return nil, errors.New("cached TMDB artwork miss")
			}
			return json.Marshal(cached)
		}

		resolvedType, resolvedID := mediaType, tmdbID
		if resolvedID <= 0 {
			match, searchErr := s.searchTMDBMovie(ctx, movie, mediaType)
			if searchErr != nil {
				return nil, searchErr
			}
			if match == nil {
				s.cacheTMDBArtworkMiss(cacheKey)
				return nil, errors.New("TMDB artwork not found")
			}
			resolvedID, resolvedType = match.ID, match.MediaType
		}

		record, detailErr := s.fetchTMDBArtwork(ctx, resolvedType, resolvedID)
		if detailErr != nil {
			return nil, detailErr
		}
		if record == nil || (record.PosterPath == "" && record.BackdropPath == "" && record.LogoPath == "") {
			s.cacheTMDBArtworkMiss(cacheKey)
			return nil, errors.New("TMDB detail has no artwork")
		}
		value, marshalErr := json.Marshal(record)
		if marshalErr == nil {
			s.cache.Set(context.Background(), cacheKey, value, s.cfg.TMDBArtworkTTL)
		}
		return value, marshalErr
	})
	if err != nil {
		return nil, err
	}
	var record tmdbArtworkRecord
	if err := json.Unmarshal(encoded, &record); err != nil {
		return nil, err
	}
	return &record, nil
}

func (s *Service) readTMDBArtworkCache(ctx context.Context, key string) (*tmdbArtworkRecord, bool, bool) {
	encoded, ok := s.cache.Get(ctx, key)
	if !ok {
		return nil, false, false
	}
	if string(encoded) == `{"miss":true}` {
		return nil, false, true
	}
	var record tmdbArtworkRecord
	if json.Unmarshal(encoded, &record) != nil || record.ID <= 0 {
		return nil, false, false
	}
	return &record, true, true
}

func (s *Service) cacheTMDBArtworkMiss(key string) {
	s.cache.Set(context.Background(), key, []byte(`{"miss":true}`), s.cfg.TMDBArtworkMissTTL)
}

func (s *Service) searchTMDBMovie(ctx context.Context, movie map[string]any, preferredType string) (*tmdbSearchItem, error) {
	title := stripSeasonSuffix(firstString(movie["origin_name"], movie["name"], movie["title"]))
	if title == "" {
		return nil, nil
	}
	params := url.Values{"query": []string{title}, "language": []string{"vi-VN"}, "include_adult": []string{"false"}}
	var response tmdbSearchResponse
	if err := s.fetchTMDBJSON(ctx, "/search/multi", params, &response); err != nil {
		return nil, err
	}

	expectedTitles := []string{
		normalizeText(stripSeasonSuffix(firstString(movie["origin_name"]))),
		normalizeText(stripSeasonSuffix(firstString(movie["name"]))),
		normalizeText(stripSeasonSuffix(firstString(movie["title"]))),
	}
	expectedYear := numberValue(movie["year"])
	type scoredMatch struct {
		item  tmdbSearchItem
		score float64
	}
	var matches []scoredMatch
	for _, item := range response.Results {
		if item.MediaType != "movie" && item.MediaType != "tv" {
			continue
		}
		candidateTitles := []string{normalizeText(item.Title), normalizeText(item.Name), normalizeText(item.OriginalTitle), normalizeText(item.OriginalName)}
		similarity := 0.0
		for _, expected := range expectedTitles {
			for _, candidate := range candidateTitles {
				if value := textSimilarity(expected, candidate); value > similarity {
					similarity = value
				}
			}
		}
		candidateYear := yearFromDate(firstString(item.ReleaseDate, item.FirstAirDate))
		yearDelta := 0
		if expectedYear > 0 && candidateYear > 0 {
			yearDelta = expectedYear - candidateYear
			if yearDelta < 0 {
				yearDelta = -yearDelta
			}
		}
		maxYearDelta := 2
		if item.MediaType == "tv" {
			maxYearDelta = 6
		}
		if similarity < 0.72 || (expectedYear > 0 && candidateYear > 0 && yearDelta > maxYearDelta) {
			continue
		}
		typeBonus := 0.0
		if item.MediaType == preferredType {
			typeBonus = 12
		}
		yearBonus := 0.0
		if expectedYear > 0 && candidateYear > 0 {
			yearBonus = float64(maxInt(0, 8-yearDelta*4))
		}
		matches = append(matches, scoredMatch{item: item, score: similarity*100 + typeBonus + yearBonus + minFloat(item.Popularity/100, 5)})
	}
	if len(matches) == 0 {
		return nil, nil
	}
	sort.SliceStable(matches, func(i, j int) bool { return matches[i].score > matches[j].score })
	return &matches[0].item, nil
}

func (s *Service) fetchTMDBArtwork(ctx context.Context, mediaType string, id int) (*tmdbArtworkRecord, error) {
	if mediaType != "tv" {
		mediaType = "movie"
	}
	params := url.Values{
		"append_to_response":     []string{"images"},
		"include_image_language": []string{"vi,en,null,ja,ko"},
		"language":               []string{"vi-VN"},
	}
	var detail tmdbDetailResponse
	if err := s.fetchTMDBJSON(ctx, fmt.Sprintf("/%s/%d", mediaType, id), params, &detail); err != nil {
		return nil, err
	}
	if detail.ID <= 0 {
		return nil, errors.New("invalid TMDB detail")
	}
	return &tmdbArtworkRecord{
		ID: detail.ID, MediaType: mediaType, PosterPath: detail.PosterPath,
		BackdropPath: detail.BackdropPath, LogoPath: bestTMDBLogo(detail.Images.Logos),
	}, nil
}

func (s *Service) fetchTMDBJSON(ctx context.Context, path string, params url.Values, target any) error {
	base := strings.TrimRight(s.cfg.TMDBBaseURL, "/")
	requestURL, err := url.Parse(base + "/" + strings.TrimLeft(path, "/"))
	if err != nil {
		return err
	}
	query := requestURL.Query()
	for key, values := range params {
		for _, value := range values {
			query.Add(key, value)
		}
	}
	if s.cfg.TMDBAccessToken == "" {
		query.Set("api_key", s.cfg.TMDBAPIKey)
	}
	requestURL.RawQuery = query.Encode()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL.String(), nil)
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "FlexPhim-Catalog-Gateway/1.0")
	if s.cfg.TMDBAccessToken != "" {
		request.Header.Set("Authorization", "Bearer "+s.cfg.TMDBAccessToken)
	}
	response, err := s.tmdbClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		_, _ = io.CopyN(io.Discard, response.Body, 8*1024)
		return fmt.Errorf("TMDB status %d", response.StatusCode)
	}
	return json.NewDecoder(io.LimitReader(response.Body, 2*1024*1024)).Decode(target)
}

func movieTMDBIdentity(movie map[string]any) (string, int) {
	mediaType := normalizeTMDBMediaType(firstString(movie["type"]))
	tmdbID := numberValue(movie["tmdbId"])
	if tmdb, ok := movie["tmdb"].(map[string]any); ok {
		if value := numberValue(tmdb["id"]); value > 0 {
			tmdbID = value
		}
		if value := firstString(tmdb["type"]); value != "" {
			mediaType = normalizeTMDBMediaType(value)
		}
	}
	return mediaType, tmdbID
}

func normalizeTMDBMediaType(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "tv" || value == "series" || value == "tvshows" || value == "phim-bo" || strings.Contains(value, "series") {
		return "tv"
	}
	return "movie"
}

func applyTMDBArtwork(movie map[string]any, artwork tmdbArtworkRecord) {
	posterW185 := tmdbImageURL("w185", artwork.PosterPath)
	posterW342 := tmdbImageURL("w342", artwork.PosterPath)
	posterW500 := tmdbImageURL("w500", artwork.PosterPath)
	backdropW780 := tmdbImageURL("w780", artwork.BackdropPath)
	backdropW1280 := tmdbImageURL("w1280", artwork.BackdropPath)
	backdropOriginal := tmdbImageURL("original", artwork.BackdropPath)
	logoW300 := tmdbImageURL("w300", artwork.LogoPath)
	logoW500 := tmdbImageURL("w500", artwork.LogoPath)

	movie["tmdbId"] = artwork.ID
	movie["poster_path"] = artwork.PosterPath
	movie["backdrop_path"] = artwork.BackdropPath
	movie["logo_path"] = artwork.LogoPath
	tmdb, _ := movie["tmdb"].(map[string]any)
	if tmdb == nil {
		tmdb = make(map[string]any)
	}
	tmdb["id"] = artwork.ID
	tmdb["type"] = artwork.MediaType
	tmdb["poster_path"] = artwork.PosterPath
	tmdb["backdrop_path"] = artwork.BackdropPath
	tmdb["logo_path"] = artwork.LogoPath
	movie["tmdb"] = tmdb
	movie["artwork"] = map[string]any{
		"tmdbId":        artwork.ID,
		"type":          artwork.MediaType,
		"poster_path":   artwork.PosterPath,
		"backdrop_path": artwork.BackdropPath,
		"logo_path":     artwork.LogoPath,
		"poster":        map[string]any{"w185": posterW185, "w342": posterW342, "w500": posterW500},
		"backdrop":      map[string]any{"w780": backdropW780, "w1280": backdropW1280, "original": backdropOriginal},
		"logo":          map[string]any{"w300": logoW300, "w500": logoW500},
	}
	if posterW500 != "" {
		movie["_posterCandidates"] = prependArtworkCandidate(posterW500, movie["_posterCandidates"], movie["poster_url"])
		movie["poster_url"] = posterW500
	}
	if backdropW1280 != "" {
		movie["_thumbCandidates"] = prependArtworkCandidate(backdropW1280, movie["_thumbCandidates"], movie["thumb_url"])
		movie["thumb_url"] = backdropW1280
	}
	if logoW500 != "" {
		movie["titleLogo"] = logoW500
	}
}

func prependArtworkCandidate(primary string, values ...any) []string {
	result := []string{primary}
	seen := map[string]bool{primary: true}
	var add func(any)
	add = func(value any) {
		switch typed := value.(type) {
		case string:
			clean := strings.TrimSpace(typed)
			if clean != "" && !seen[clean] {
				seen[clean] = true
				result = append(result, clean)
			}
		case []string:
			for _, item := range typed {
				add(item)
			}
		case []any:
			for _, item := range typed {
				add(item)
			}
		}
	}
	for _, value := range values {
		add(value)
	}
	return result
}

func tmdbImageURL(size, path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	return tmdbImageBaseURL + "/" + size + "/" + strings.TrimLeft(path, "/")
}

func bestTMDBLogo(logos []tmdbImage) string {
	if len(logos) == 0 {
		return ""
	}
	languageRank := func(language *string) int {
		if language == nil {
			return 2
		}
		switch strings.ToLower(strings.TrimSpace(*language)) {
		case "vi":
			return 0
		case "en":
			return 1
		case "ja", "ko":
			return 3
		default:
			return 4
		}
	}
	sort.SliceStable(logos, func(i, j int) bool {
		left, right := languageRank(logos[i].Language), languageRank(logos[j].Language)
		if left != right {
			return left < right
		}
		if logos[i].Vote != logos[j].Vote {
			return logos[i].Vote > logos[j].Vote
		}
		return logos[i].Width > logos[j].Width
	})
	return logos[0].FilePath
}

func stripSeasonSuffix(value string) string {
	words := strings.Fields(value)
	for index, word := range words {
		clean := normalizeText(word)
		if clean == "season" || clean == "part" || clean == "phan" || clean == "mua" {
			if index+1 < len(words) {
				if _, err := strconv.Atoi(strings.Trim(words[index+1], "()[]-")); err == nil {
					return strings.Join(words[:index], " ")
				}
			}
		}
	}
	return value
}

func textSimilarity(left, right string) float64 {
	if left == "" || right == "" {
		return 0
	}
	if left == right {
		return 1
	}
	if strings.Contains(left, right) || strings.Contains(right, left) {
		shorter, longer := len(left), len(right)
		if shorter > longer {
			shorter, longer = longer, shorter
		}
		return float64(shorter) / float64(longer)
	}
	leftTokens, rightTokens := strings.Fields(left), strings.Fields(right)
	union := make(map[string]bool, len(leftTokens)+len(rightTokens))
	for _, token := range leftTokens {
		union[token] = true
	}
	shared := 0
	for _, token := range rightTokens {
		if union[token] {
			shared++
		}
		union[token] = true
	}
	if len(union) == 0 {
		return 0
	}
	return float64(shared) / float64(len(union))
}

func yearFromDate(value string) int {
	if len(value) < 4 {
		return 0
	}
	year, _ := strconv.Atoi(value[:4])
	return year
}

func minFloat(left, right float64) float64 {
	if left < right {
		return left
	}
	return right
}
