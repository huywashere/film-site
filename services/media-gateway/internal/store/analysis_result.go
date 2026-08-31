package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"

	"github.com/redis/go-redis/v9"
)

// AnalysisResult mirrors the JSON structure produced by the Rust
// media-worker-rs service. Fields use camelCase to match serde output.
type AnalysisResult struct {
	SchemaVersion    int      `json:"schemaVersion"`
	JobID            string   `json:"jobId"`
	URL              string   `json:"url"`
	FinalURL         string   `json:"finalUrl"`
	Provider         string   `json:"provider"`
	MovieSlug        string   `json:"movieSlug"`
	Episode          string   `json:"episode"`
	Playable         bool     `json:"playable"`
	PlaylistKind     string   `json:"playlistKind"`
	DurationSeconds  float64  `json:"durationSeconds"`
	SegmentCount     int      `json:"segmentCount"`
	SampledSegments  int      `json:"sampledSegments"`
	BrokenSegments   []string `json:"brokenSegments"`
	Variants         []any    `json:"variants"`
	AdMarkers        []any    `json:"adMarkers"`
	IntroMarkers     []any    `json:"introMarkers"`
	Discontinuities  int      `json:"discontinuities"`
	ManifestLatency  uint64   `json:"manifestLatencyMs"`
	HealthScore      uint8    `json:"healthScore"`
	AnalyzedAt       uint64   `json:"analyzedAt"`
	Errors           []string `json:"errors"`
	Encrypted        bool     `json:"encrypted"`
	EncryptionMethod string   `json:"encryptionMethod,omitempty"`
}

// AnalysisResultStore reads cached HLS analysis results written by the Rust worker.
type AnalysisResultStore interface {
	// GetResult returns the cached analysis result for the given HLS URL, if any.
	GetResult(ctx context.Context, rawURL string) (*AnalysisResult, bool)
	Close() error
}

// RedisAnalysisResultStore implements AnalysisResultStore using Redis.
type RedisAnalysisResultStore struct {
	client *redis.Client
	prefix string
}

// NewRedisAnalysisResultStore creates a store that reads from the key namespace
// written by the Rust worker (default prefix: "netphim:hls:analysis:v1:").
func NewRedisAnalysisResultStore(rawURL, prefix string) (*RedisAnalysisResultStore, error) {
	options, err := redis.ParseURL(rawURL)
	if err != nil {
		return nil, err
	}
	return &RedisAnalysisResultStore{
		client: redis.NewClient(options),
		prefix: prefix,
	}, nil
}

func (s *RedisAnalysisResultStore) GetResult(ctx context.Context, rawURL string) (*AnalysisResult, bool) {
	key := s.prefix + analysisURLFingerprint(rawURL)
	value, err := s.client.Get(ctx, key).Bytes()
	if err != nil {
		return nil, false
	}
	var result AnalysisResult
	if json.Unmarshal(value, &result) != nil {
		return nil, false
	}
	return &result, true
}

func (s *RedisAnalysisResultStore) Close() error { return s.client.Close() }

func analysisURLFingerprint(rawURL string) string {
	sum := sha256.Sum256([]byte(rawURL))
	return hex.EncodeToString(sum[:])
}
