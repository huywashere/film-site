package catalog

import (
	"context"

	"github.com/netphim/media-gateway/internal/config"
)

// searchIndex abstracts the derived search engine (Typesense as primary, Meilisearch as legacy fallback).
type searchIndex interface {
	Close()
	Enqueue(items []map[string]any)
	DeleteCanonical(canonicalKeys []string)
	Search(ctx context.Context, query string, page, limit int, filters SearchFilters) (searchResponse, error)
	SyncSnapshot(ctx context.Context, movies []map[string]any, prune bool) error
	Status(ctx context.Context) searchStatus
	Engine() string
	IsReady() bool
}

type searchResponse struct {
	Hits               []map[string]any `json:"hits"`
	EstimatedTotalHits int              `json:"estimatedTotalHits"`
	TotalHits          int              `json:"totalHits"`
	ProcessingTimeMS   int              `json:"processingTimeMs"`
}

type searchStatus struct {
	Enabled             bool   `json:"enabled"`
	Ready               bool   `json:"ready"`
	Engine              string `json:"engine"`
	QueueDepth          int    `json:"queueDepth"`
	QueueCapacity       int    `json:"queueCapacity"`
	Indexed             int64  `json:"indexed"`
	Deleted             int64  `json:"deleted"`
	Dropped             int64  `json:"notIndexedQueueDrops"`
	Failures            int64  `json:"failures"`
	Documents           int    `json:"documents"`
	LastWriteAt         int64  `json:"lastWriteAt"`
	SyncRunning         bool   `json:"syncRunning"`
	LastSyncStartedAt   int64  `json:"lastSyncStartedAt"`
	LastSyncCompletedAt int64  `json:"lastSyncCompletedAt"`
	LastSyncItems       int64  `json:"lastSyncItems"`
	LastSyncDeleted     int64  `json:"lastSyncDeleted"`
	LastSyncError       string `json:"lastSyncError,omitempty"`
}

// newSearchIndex chooses the appropriate search index based on configuration.
// Typesense is prioritized as the primary high-performance engine.
func newSearchIndex(cfg config.Config) searchIndex {
	if cfg.TypesenseURL != "" {
		return newTypesenseSearchIndex(cfg)
	}
	if cfg.MeiliURL != "" {
		return newMeiliSearchIndex(cfg)
	}
	return nil
}

