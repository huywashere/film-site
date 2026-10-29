package recommender

// MovieItem represents a catalog movie for indexing and recommendation scoring.
type MovieItem struct {
	ID          string   `json:"id"`
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	OriginTitle string   `json:"origin_title,omitempty"`
	Genres      []string `json:"genres,omitempty"`
	Countries   []string `json:"countries,omitempty"`
	Actors      []string `json:"actors,omitempty"`
	Directors   []string `json:"directors,omitempty"`
	Type        string   `json:"type,omitempty"`
	Year        int      `json:"year,omitempty"`
	Overview    string   `json:"overview,omitempty"`
	ThumbURL    string   `json:"thumb_url,omitempty"`
	PosterURL   string   `json:"poster_url,omitempty"`
	ViewCount   int64    `json:"view_count,omitempty"`
	RatingScore float64  `json:"rating_score,omitempty"`
	RatingCount int      `json:"rating_count,omitempty"`
}

// RecommendationItem represents a formatted recommendation response item.
type RecommendationItem struct {
	ID         string  `json:"_id"`
	Slug       string  `json:"slug"`
	Name       string  `json:"name"`
	OriginName string  `json:"origin_name"`
	ThumbURL   string  `json:"thumb_url"`
	PosterURL  string  `json:"poster_url"`
	Year       int     `json:"year"`
	Type       string  `json:"type"`
	Quality    string  `json:"quality"`
	Lang       string  `json:"lang"`
	View       int64   `json:"view"`
	Rating     float64 `json:"rating"`
	Rank       int     `json:"rank,omitempty"`
	Score      float64 `json:"score,omitempty"`
}

// RecommendationResponse wraps items with source telemetry.
type RecommendationResponse struct {
	Items  []RecommendationItem `json:"items"`
	Source string               `json:"source"`
	Total  int                  `json:"total"`
}

