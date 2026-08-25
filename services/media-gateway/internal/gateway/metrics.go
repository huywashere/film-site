package gateway

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

type Metrics struct {
	requests       atomic.Uint64
	errors         atomic.Uint64
	bytes          atomic.Uint64
	manifestHits   atomic.Uint64
	manifestMisses atomic.Uint64
	activeStreams  atomic.Int64
	hostMu         sync.RWMutex
	hosts          map[string]HostHealth
}

type HostHealth struct {
	Successes   uint64    `json:"successes"`
	Failures    uint64    `json:"failures"`
	LastSuccess time.Time `json:"lastSuccess,omitempty"`
	LastFailure time.Time `json:"lastFailure,omitempty"`
}

func NewMetrics() *Metrics { return &Metrics{hosts: make(map[string]HostHealth)} }

func (m *Metrics) recordHost(host string, success bool) {
	m.hostMu.Lock()
	defer m.hostMu.Unlock()
	item := m.hosts[host]
	if success {
		item.Successes++
		item.LastSuccess = time.Now().UTC()
	} else {
		item.Failures++
		item.LastFailure = time.Now().UTC()
	}
	m.hosts[host] = item
}

func (m *Metrics) Hosts() map[string]HostHealth {
	m.hostMu.RLock()
	defer m.hostMu.RUnlock()
	result := make(map[string]HostHealth, len(m.hosts))
	for key, value := range m.hosts {
		result[key] = value
	}
	return result
}

func (m *Metrics) Handler(c *gin.Context) {
	c.Header("Content-Type", "text/plain; version=0.0.4")
	lines := []string{
		"# TYPE netphim_media_requests_total counter",
		fmt.Sprintf("netphim_media_requests_total %d", m.requests.Load()),
		"# TYPE netphim_media_errors_total counter",
		fmt.Sprintf("netphim_media_errors_total %d", m.errors.Load()),
		"# TYPE netphim_media_bytes_total counter",
		fmt.Sprintf("netphim_media_bytes_total %d", m.bytes.Load()),
		"# TYPE netphim_media_active_streams gauge",
		fmt.Sprintf("netphim_media_active_streams %d", m.activeStreams.Load()),
		"# TYPE netphim_media_manifest_cache_hits_total counter",
		fmt.Sprintf("netphim_media_manifest_cache_hits_total %d", m.manifestHits.Load()),
		"# TYPE netphim_media_manifest_cache_misses_total counter",
		fmt.Sprintf("netphim_media_manifest_cache_misses_total %d", m.manifestMisses.Load()),
	}
	c.String(http.StatusOK, strings.Join(lines, "\n")+"\n")
}
