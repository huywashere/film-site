package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

type AnalysisJob struct {
	JobID       string `json:"jobId"`
	URL         string `json:"url"`
	Provider    string `json:"provider,omitempty"`
	MovieSlug   string `json:"movieSlug,omitempty"`
	Episode     string `json:"episode,omitempty"`
	RequestedAt int64  `json:"requestedAt"`
}

func NewAnalysisJob(rawURL, provider string) AnalysisJob {
	return AnalysisJob{
		JobID:       analysisFingerprint(rawURL),
		URL:         rawURL,
		Provider:    provider,
		RequestedAt: time.Now().Unix(),
	}
}

type AnalysisQueue interface {
	Enqueue(context.Context, AnalysisJob) error
	Close() error
}

type RedisAnalysisQueue struct {
	client   *redis.Client
	stream   string
	dedupTTL time.Duration
}

func NewRedisAnalysisQueue(rawURL, stream string, dedupTTL time.Duration) (*RedisAnalysisQueue, error) {
	options, err := redis.ParseURL(rawURL)
	if err != nil {
		return nil, err
	}
	return &RedisAnalysisQueue{
		client:   redis.NewClient(options),
		stream:   stream,
		dedupTTL: dedupTTL,
	}, nil
}

func (q *RedisAnalysisQueue) Enqueue(ctx context.Context, job AnalysisJob) error {
	dedupKey := "netphim:hls:analysis:queued:v1:" + analysisFingerprint(job.URL)
	acquired, err := q.client.SetNX(ctx, dedupKey, "1", q.dedupTTL).Result()
	if err != nil || !acquired {
		return err
	}
	payload, err := json.Marshal(job)
	if err != nil {
		_ = q.client.Del(ctx, dedupKey).Err()
		return err
	}
	err = q.client.XAdd(ctx, &redis.XAddArgs{
		Stream: q.stream,
		MaxLen: 10_000,
		Approx: true,
		Values: map[string]any{"payload": string(payload)},
	}).Err()
	if err != nil {
		_ = q.client.Del(ctx, dedupKey).Err()
	}
	return err
}

func (q *RedisAnalysisQueue) Close() error { return q.client.Close() }

func analysisFingerprint(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}
