package gateway

import (
	"sync"
	"time"
)

type rateEntry struct {
	tokens float64
	last   time.Time
}

type RateLimiter struct {
	mu       sync.Mutex
	entries  map[string]rateEntry
	rate     float64
	capacity float64
	lastGC   time.Time
}

func NewRateLimiter(rate, burst int) *RateLimiter {
	return &RateLimiter{
		entries:  make(map[string]rateEntry),
		rate:     float64(rate),
		capacity: float64(burst),
		lastGC:   time.Now(),
	}
}

func (l *RateLimiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	entry, exists := l.entries[key]
	if !exists {
		entry = rateEntry{tokens: l.capacity, last: now}
	}
	entry.tokens += now.Sub(entry.last).Seconds() * l.rate
	if entry.tokens > l.capacity {
		entry.tokens = l.capacity
	}
	entry.last = now
	allowed := entry.tokens >= 1
	if allowed {
		entry.tokens--
	}
	l.entries[key] = entry

	if now.Sub(l.lastGC) > 10*time.Minute {
		for ip, candidate := range l.entries {
			if now.Sub(candidate.last) > 15*time.Minute {
				delete(l.entries, ip)
			}
		}
		l.lastGC = now
	}
	return allowed
}
