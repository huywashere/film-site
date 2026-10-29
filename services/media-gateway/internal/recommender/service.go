package recommender

import (
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

// Service provides HTTP handlers and thread-safe engine access.
type Service struct {
	mu     sync.RWMutex
	engine *Engine
}

// NewService initializes a recommender service.
func NewService() *Service {
	s := &Service{
		engine: NewEngine(),
	}
	s.seedDefaultCatalog()
	return s
}

// IngestMovies updates the indexed catalog in memory with zero-downtime.
func (s *Service) IngestMovies(movies []MovieItem) {
	newEngine := NewEngine()
	newEngine.IndexMovies(movies)

	s.mu.Lock()
	s.engine = newEngine
	s.mu.Unlock()
}

// HandleGetTop10 handles GET /v1/recommendations/top10.
func (s *Service) HandleGetTop10(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	userId := c.Query("userId")

	s.mu.RLock()
	items := s.engine.GetTop10(userId, limit)
	s.mu.RUnlock()

	c.Header("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
	c.Header("X-Source", "Go-Recommender-Engine")
	c.JSON(http.StatusOK, RecommendationResponse{
		Items:  items,
		Source: "go-recommender-engine",
		Total:  len(items),
	})
}

// HandleGetSimilar handles GET /v1/recommendations/similar/:slug.
func (s *Service) HandleGetSimilar(c *gin.Context) {
	slug := strings.TrimSpace(c.Param("slug"))
	if slug == "" {
		slug = strings.TrimSpace(c.Query("slug"))
	}
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing movie slug parameter"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
	if limit <= 0 || limit > 50 {
		limit = 12
	}

	s.mu.RLock()
	items := s.engine.GetSimilar(slug, limit)
	s.mu.RUnlock()

	c.Header("Cache-Control", "public, max-age=600, stale-while-revalidate=1200")
	c.Header("X-Source", "Go-Recommender-Engine")
	c.JSON(http.StatusOK, RecommendationResponse{
		Items:  items,
		Source: "go-recommender-engine",
		Total:  len(items),
	})
}

// HandleSyncCatalog handles POST /v1/recommendations/sync.
func (s *Service) HandleSyncCatalog(c *gin.Context) {
	var payload struct {
		Movies []MovieItem `json:"movies"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload: " + err.Error()})
		return
	}

	if len(payload.Movies) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "empty movies array"})
		return
	}

	s.IngestMovies(payload.Movies)
	c.JSON(http.StatusOK, gin.H{
		"message": "catalog synced successfully",
		"total":   len(payload.Movies),
	})
}

func (s *Service) seedDefaultCatalog() {
	sample := []MovieItem{
		{
			ID: "1", Slug: "ha-canh-noi-anh", Title: "Hạ Cánh Nơi Anh", OriginTitle: "Crash Landing on You",
			Genres: []string{"Tình Cảm", "Hài Hước", "Chính Kịch"}, Countries: []string{"Hàn Quốc"},
			Type: "series", Year: 2019, ViewCount: 154000, RatingScore: 9.2, RatingCount: 1200,
		},
		{
			ID: "2", Slug: "dien-hy-cong-luoc", Title: "Diên Hi Công Lược", OriginTitle: "Story of Yanxi Palace",
			Genres: []string{"Cổ Trang", "Tình Cảm", "Chính Kịch"}, Countries: []string{"Trung Quốc"},
			Type: "series", Year: 2018, ViewCount: 125000, RatingScore: 8.9, RatingCount: 980,
		},
		{
			ID: "3", Slug: "avatar-dong-chay-cua-nuoc", Title: "Avatar: Dòng Chảy Của Nước", OriginTitle: "Avatar: The Way of Water",
			Genres: []string{"Khoa Học Viễn Tưởng", "Hành Động", "Phiêu Lưu"}, Countries: []string{"Âu Mỹ"},
			Type: "single", Year: 2022, ViewCount: 230000, RatingScore: 8.7, RatingCount: 2500,
		},
		{
			ID: "4", Slug: "oppenheimer", Title: "Oppenheimer", OriginTitle: "Oppenheimer",
			Genres: []string{"Lịch Sử", "Chiến Tranh", "Chính Kịch"}, Countries: []string{"Âu Mỹ"},
			Type: "single", Year: 2023, ViewCount: 180000, RatingScore: 9.1, RatingCount: 2100,
		},
		{
			ID: "5", Slug: "chu-thuat-hoi-chien", Title: "Chú Thuật Hồi Chiến", OriginTitle: "Jujutsu Kaisen",
			Genres: []string{"Hoạt Hình", "Hành Động", "Huyền Huyễn"}, Countries: []string{"Nhật Bản"},
			Type: "hoathinh", Year: 2020, ViewCount: 310000, RatingScore: 9.3, RatingCount: 3400,
		},
	}
	s.IngestMovies(sample)
}

