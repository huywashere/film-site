package crawler

import (
	"context"
	"sync"
	"time"
)

type MovieItem struct {
	Name         string   `json:"name"`
	Slug         string   `json:"slug"`
	OriginName   string   `json:"origin_name"`
	Type         string   `json:"type"`
	Year         int      `json:"year"`
	Quality      string   `json:"quality"`
	Lang         string   `json:"lang"`
	PosterURL    string   `json:"poster_url"`
	ThumbURL     string   `json:"thumb_url"`
	Time         string   `json:"time"`
	EpisodeTotal string   `json:"episode_total"`
	EpisodeCurrent string `json:"episode_current"`
	Content      string   `json:"content"`
	TrailerURL   string   `json:"trailer_url"`
	Categories   []string `json:"categories"`
	Countries    []string `json:"countries"`
	Actors       []string `json:"actors"`
	Directors    []string `json:"directors"`
	Episodes     []any    `json:"episodes"`
	Source       string   `json:"source"`
	UpdatedAt    string   `json:"updated_at"`
}

type CrawlJob struct {
	ID             string             `json:"id"`
	Provider       string             `json:"provider"`
	FromPage       int                `json:"fromPage"`
	ToPage         int                `json:"toPage"`
	TotalPages     int                `json:"totalPages"`
	ProcessedPages int                `json:"processedPages"`
	TotalMovies    int                `json:"totalMovies"`
	SuccessCount   int                `json:"successCount"`
	FailedCount    int                `json:"failedCount"`
	Status         string             `json:"status"` // queued, running, completed, cancelled, failed
	ErrorMessage   string             `json:"errorMessage,omitempty"`
	StartedAt      time.Time          `json:"startedAt"`
	FinishedAt     *time.Time         `json:"finishedAt,omitempty"`
	CancelFunc     context.CancelFunc `json:"-"`
	Mu             sync.RWMutex       `json:"-"`
}

func (j *CrawlJob) Snapshot() map[string]any {
	j.Mu.RLock()
	defer j.Mu.RUnlock()

	var finishedAtStr any
	if j.FinishedAt != nil {
		finishedAtStr = j.FinishedAt.Format(time.RFC3339)
	}

	return map[string]any{
		"id":             j.ID,
		"provider":       j.Provider,
		"fromPage":       j.FromPage,
		"toPage":         j.ToPage,
		"totalPages":     j.TotalPages,
		"processedPages": j.ProcessedPages,
		"totalMovies":    j.TotalMovies,
		"successCount":   j.SuccessCount,
		"failedCount":    j.FailedCount,
		"status":         j.Status,
		"errorMessage":   j.ErrorMessage,
		"startedAt":      j.StartedAt.Format(time.RFC3339),
		"finishedAt":     finishedAtStr,
	}
}

type BatchCrawlOptions struct {
	Provider string `json:"provider"`
	FromPage int    `json:"fromPage"`
	ToPage   int    `json:"toPage"`
	DelayMs  int    `json:"delayMs"`
}

