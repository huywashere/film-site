package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type Manifest struct {
	Content  string `json:"content"`
	FinalURL string `json:"finalUrl"`
}

type ManifestStore interface {
	Get(context.Context, string) (Manifest, bool)
	Set(context.Context, string, Manifest)
	Ready(context.Context) bool
	Close() error
}

type RedisManifestStore struct {
	client *redis.Client
	ttl    time.Duration
}

func NewRedisManifestStore(rawURL string, ttl time.Duration) (*RedisManifestStore, error) {
	options, err := redis.ParseURL(rawURL)
	if err != nil {
		return nil, err
	}
	return &RedisManifestStore{client: redis.NewClient(options), ttl: ttl}, nil
}

func (s *RedisManifestStore) Get(ctx context.Context, target string) (Manifest, bool) {
	value, err := s.client.Get(ctx, cacheKey(target)).Bytes()
	if err != nil {
		return Manifest{}, false
	}
	var result Manifest
	if json.Unmarshal(value, &result) != nil {
		return Manifest{}, false
	}
	return result, true
}

func (s *RedisManifestStore) Set(ctx context.Context, target string, value Manifest) {
	encoded, err := json.Marshal(value)
	if err == nil {
		_ = s.client.Set(ctx, cacheKey(target), encoded, s.ttl).Err()
	}
}

func (s *RedisManifestStore) Ready(ctx context.Context) bool {
	return s.client.Ping(ctx).Err() == nil
}

func (s *RedisManifestStore) Close() error { return s.client.Close() }

func cacheKey(target string) string {
	sum := sha256.Sum256([]byte(target))
	return "media:manifest:v1:" + hex.EncodeToString(sum[:])
}

type MemoryManifestStore struct {
	ttl    time.Duration
	items  map[string]memoryEntry
	mu     sync.RWMutex
	stopGC chan struct{}
}

type memoryEntry struct {
	manifest Manifest
	expires  time.Time
}

func NewMemoryManifestStore(ttl time.Duration) *MemoryManifestStore {
	s := &MemoryManifestStore{
		ttl:    ttl,
		items:  make(map[string]memoryEntry),
		stopGC: make(chan struct{}),
	}
	go s.gc()
	return s
}

func (s *MemoryManifestStore) Get(_ context.Context, target string) (Manifest, bool) {
	s.mu.RLock()
	entry, ok := s.items[target]
	s.mu.RUnlock()

	if !ok || time.Now().After(entry.expires) {
		if ok {
			s.mu.Lock()
			delete(s.items, target)
			s.mu.Unlock()
		}
		return Manifest{}, false
	}
	return entry.manifest, true
}

func (s *MemoryManifestStore) Set(_ context.Context, target string, value Manifest) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[target] = memoryEntry{manifest: value, expires: time.Now().Add(s.ttl)}
}

func (s *MemoryManifestStore) Ready(context.Context) bool { return true }

func (s *MemoryManifestStore) Close() error {
	close(s.stopGC)
	return nil
}

func (s *MemoryManifestStore) gc() {
	ticker := time.NewTicker(s.ttl)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			now := time.Now()
			s.mu.Lock()
			for k, v := range s.items {
				if now.After(v.expires) {
					delete(s.items, k)
				}
			}
			s.mu.Unlock()
		case <-s.stopGC:
			return
		}
	}
}
