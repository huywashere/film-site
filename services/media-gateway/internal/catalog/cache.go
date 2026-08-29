package catalog

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type Cache interface {
	Get(context.Context, string) ([]byte, bool)
	Set(context.Context, string, []byte, time.Duration)
	Close() error
}

type memoryCacheEntry struct {
	value   []byte
	expires time.Time
}

type MemoryCache struct {
	mu      sync.Mutex
	items   map[string]memoryCacheEntry
	maxSize int
}

func NewMemoryCache(maxSize int) *MemoryCache {
	return &MemoryCache{items: make(map[string]memoryCacheEntry), maxSize: maxSize}
}

func (c *MemoryCache) Get(_ context.Context, key string) ([]byte, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.items[key]
	if !ok || time.Now().After(entry.expires) {
		delete(c.items, key)
		return nil, false
	}
	return append([]byte(nil), entry.value...), true
}

func (c *MemoryCache) Set(_ context.Context, key string, value []byte, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.items) >= c.maxSize {
		now := time.Now()
		for candidate, entry := range c.items {
			if now.After(entry.expires) {
				delete(c.items, candidate)
			}
		}
	}
	for len(c.items) >= c.maxSize {
		for candidate := range c.items {
			delete(c.items, candidate)
			break
		}
	}
	c.items[key] = memoryCacheEntry{value: append([]byte(nil), value...), expires: time.Now().Add(ttl)}
}

func (c *MemoryCache) Close() error { return nil }

type RedisCache struct {
	client *redis.Client
	memory *MemoryCache
}

func NewRedisCache(rawURL string, maxMemoryEntries int) (*RedisCache, error) {
	options, err := redis.ParseURL(rawURL)
	if err != nil {
		return nil, err
	}
	return &RedisCache{client: redis.NewClient(options), memory: NewMemoryCache(maxMemoryEntries)}, nil
}

func (c *RedisCache) Get(ctx context.Context, key string) ([]byte, bool) {
	key = catalogCacheKey(key)
	if value, err := c.client.Get(ctx, key).Bytes(); err == nil {
		return value, true
	}
	return c.memory.Get(ctx, key)
}

func (c *RedisCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) {
	key = catalogCacheKey(key)
	c.memory.Set(ctx, key, value, ttl)
	_ = c.client.Set(ctx, key, value, ttl).Err()
}

func (c *RedisCache) Close() error { return c.client.Close() }

func catalogCacheKey(key string) string {
	sum := sha256.Sum256([]byte(key))
	return "catalog:v1:" + hex.EncodeToString(sum[:])
}
