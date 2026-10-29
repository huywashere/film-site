package recommender

import (
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

var (
	nonAlphanumericRegex = regexp.MustCompile(`[^a-zA-Z0-9\s]`)
	multipleSpacesRegex  = regexp.MustCompile(`\s+`)
)

// CleanText normalizes Vietnamese text, removes diacritics and punctuation.
func CleanText(text string) string {
	if text == "" {
		return ""
	}
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	result, _, _ := transform.String(t, text)
	result = strings.ReplaceAll(result, "đ", "d")
	result = strings.ReplaceAll(result, "Đ", "d")
	result = strings.ToLower(result)
	result = nonAlphanumericRegex.ReplaceAllString(result, " ")
	result = multipleSpacesRegex.ReplaceAllString(result, " ")
	return strings.TrimSpace(result)
}

type movieVector struct {
	tokens map[string]float64
	norm   float64
}

// Engine implements high-concurrency content-based filtering and trending scoring.
type Engine struct {
	movies    []MovieItem
	slugToIdx map[string]int
	vectors   []movieVector
}

// NewEngine creates a new recommendation engine.
func NewEngine() *Engine {
	return &Engine{
		slugToIdx: make(map[string]int),
	}
}

// IndexMovies indexes movies and precomputes sparse TF vectors.
func (e *Engine) IndexMovies(items []MovieItem) {
	e.movies = make([]MovieItem, len(items))
	copy(e.movies, items)
	e.slugToIdx = make(map[string]int, len(items))
	e.vectors = make([]movieVector, len(items))

	for idx, m := range items {
		slugKey := strings.ToLower(strings.TrimSpace(m.Slug))
		if slugKey != "" {
			e.slugToIdx[slugKey] = idx
		}
		if m.ID != "" && m.ID != slugKey {
			e.slugToIdx[m.ID] = idx
		}

		tokens := make(map[string]float64)

		addTokens := func(text string, weight float64) {
			words := strings.Fields(CleanText(text))
			for _, w := range words {
				if len(w) >= 2 {
					tokens[w] += weight
				}
			}
		}

		// Weighting schema:
		// Slug: 2x, Title: 2x, Origin: 2x, Genres: 4x, Type: 2x, Country: 1x, Actors: 1x
		addTokens(strings.ReplaceAll(m.Slug, "-", " "), 2.0)
		addTokens(m.Title, 2.0)
		addTokens(m.OriginTitle, 2.0)
		for _, g := range m.Genres {
			addTokens(g, 4.0)
		}
		for _, c := range m.Countries {
			addTokens(c, 1.0)
		}
		for _, a := range m.Actors {
			addTokens(a, 1.0)
		}
		addTokens(m.Type, 2.0)
		if m.Year > 0 {
			addTokens(strconv.Itoa(m.Year), 1.0)
		}
		addTokens(m.Overview, 0.5)

		var sumSq float64
		for _, w := range tokens {
			sumSq += w * w
		}
		normVal := math.Sqrt(sumSq)
		if normVal == 0 {
			normVal = 1.0
		}

		e.vectors[idx] = movieVector{
			tokens: tokens,
			norm:   normVal,
		}
	}
}

func cosineSimilarity(v1, v2 movieVector) float64 {
	if len(v1.tokens) == 0 || len(v2.tokens) == 0 {
		return 0
	}
	// Iterate through smaller map
	small, large := v1.tokens, v2.tokens
	if len(small) > len(large) {
		small, large = large, small
	}

	var dot float64
	for k, w1 := range small {
		if w2, ok := large[k]; ok {
			dot += w1 * w2
		}
	}
	return dot / (v1.norm * v2.norm)
}

// GetTop10 computes top trending & recommended movies.
func (e *Engine) GetTop10(userId string, limit int) []RecommendationItem {
	if len(e.movies) == 0 {
		return nil
	}
	if limit <= 0 {
		limit = 10
	}

	type scoredMovie struct {
		index int
		score float64
	}

	scores := make([]scoredMovie, len(e.movies))
	m := 5.0
	cConst := 7.5

	for i, movie := range e.movies {
		views := float64(movie.ViewCount)
		popScore := math.Log1p(views) * 2.5

		r := movie.RatingScore
		if r <= 0 {
			r = 7.5
		}
		v := float64(movie.RatingCount)
		bayesian := (v/(v+m))*r + (m/(v+m))*cConst

		totalScore := popScore*0.45 + bayesian*0.55
		scores[i] = scoredMovie{index: i, score: totalScore}
	}

	sort.Slice(scores, func(i, j int) bool {
		return scores[i].score > scores[j].score
	})

	selectedGenresCount := make(map[string]int)
	var selectedIndices []int

	for _, sm := range scores {
		if len(selectedIndices) >= limit {
			break
		}
		movie := e.movies[sm.index]

		overlap := 0
		for _, g := range movie.Genres {
			overlap += selectedGenresCount[g]
		}
		if overlap >= 3 && len(selectedIndices) < limit-2 {
			continue // Maintain genre diversity
		}

		selectedIndices = append(selectedIndices, sm.index)
		for _, g := range movie.Genres {
			selectedGenresCount[g]++
		}
	}

	result := make([]RecommendationItem, 0, len(selectedIndices))
	for rank, idx := range selectedIndices {
		item := e.formatItem(e.movies[idx], rank+1)
		result = append(result, item)
	}
	return result
}

// GetSimilar computes content-based similar movies for a given slug.
func (e *Engine) GetSimilar(slug string, limit int) []RecommendationItem {
	if len(e.movies) == 0 {
		return nil
	}
	if limit <= 0 {
		limit = 12
	}

	slugKey := strings.ToLower(strings.TrimSpace(slug))
	targetIdx, ok := e.slugToIdx[slugKey]
	if !ok {
		return e.GetTop10("", limit)
	}

	targetVec := e.vectors[targetIdx]
	targetMovie := e.movies[targetIdx]
	targetGenres := make(map[string]struct{}, len(targetMovie.Genres))
	for _, g := range targetMovie.Genres {
		targetGenres[CleanText(g)] = struct{}{}
	}

	type simItem struct {
		index int
		score float64
	}

	sims := make([]simItem, 0, len(e.movies))
	for i := range e.movies {
		if i == targetIdx {
			continue
		}

		baseSim := cosineSimilarity(targetVec, e.vectors[i])
		movie := e.movies[i]

		// Genre affinity boost
		overlap := 0
		for _, g := range movie.Genres {
			if _, exists := targetGenres[CleanText(g)]; exists {
				overlap++
			}
		}
		if overlap > 0 {
			baseSim += 0.18 * float64(overlap)
		} else {
			baseSim -= 0.10
		}

		// Hotness & view boost
		viewsBoost := math.Min(math.Log1p(float64(movie.ViewCount))*0.025, 0.12)
		ratingScore := movie.RatingScore
		if ratingScore <= 0 {
			ratingScore = 7.5
		}
		ratingBoost := math.Max((ratingScore-6.0)*0.015, 0.0)

		finalScore := baseSim + viewsBoost + ratingBoost
		if finalScore > 0 {
			sims = append(sims, simItem{index: i, score: finalScore})
		}
	}

	sort.Slice(sims, func(i, j int) bool {
		return sims[i].score > sims[j].score
	})

	if len(sims) > limit {
		sims = sims[:limit]
	}

	result := make([]RecommendationItem, 0, len(sims))
	for rank, s := range sims {
		item := e.formatItem(e.movies[s.index], rank+1)
		item.Score = math.Round(s.score*1000) / 1000
		result = append(result, item)
	}
	return result
}

func (e *Engine) formatItem(m MovieItem, rank int) RecommendationItem {
	slugVal := m.Slug
	if slugVal == "" {
		slugVal = m.ID
	}
	typeVal := m.Type
	if typeVal == "" {
		typeVal = "single"
	}
	ratingVal := m.RatingScore
	if ratingVal <= 0 {
		ratingVal = 8.5
	}

	return RecommendationItem{
		ID:         m.ID,
		Slug:       slugVal,
		Name:       m.Title,
		OriginName: m.OriginTitle,
		ThumbURL:   m.ThumbURL,
		PosterURL:  m.PosterURL,
		Year:       m.Year,
		Type:       typeVal,
		Quality:    "HD",
		Lang:       "Vietsub",
		View:       m.ViewCount,
		Rating:     ratingVal,
		Rank:       rank,
	}
}

