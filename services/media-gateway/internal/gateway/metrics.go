package gateway

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

var latencyBuckets = [...]float64{0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30}

type latencyHistogram struct {
	count   atomic.Uint64
	sumNano atomic.Uint64
	maxNano atomic.Uint64
	buckets [len(latencyBuckets)]atomic.Uint64
}

type histogramSnapshot struct {
	Count   uint64
	Sum     time.Duration
	Max     time.Duration
	Buckets [len(latencyBuckets)]uint64
}

func (h *latencyHistogram) observe(duration time.Duration) {
	if duration < 0 {
		duration = 0
	}
	nanos := uint64(duration)
	h.count.Add(1)
	h.sumNano.Add(nanos)
	for {
		current := h.maxNano.Load()
		if nanos <= current || h.maxNano.CompareAndSwap(current, nanos) {
			break
		}
	}
	seconds := duration.Seconds()
	for index, upperBound := range latencyBuckets {
		if seconds <= upperBound {
			h.buckets[index].Add(1)
		}
	}
}

func (h *latencyHistogram) snapshot() histogramSnapshot {
	result := histogramSnapshot{
		Count: h.count.Load(),
		Sum:   time.Duration(h.sumNano.Load()),
		Max:   time.Duration(h.maxNano.Load()),
	}
	for index := range latencyBuckets {
		result.Buckets[index] = h.buckets[index].Load()
	}
	return result
}

func (s histogramSnapshot) percentile(percentile float64) float64 {
	if s.Count == 0 {
		return 0
	}
	target := uint64(float64(s.Count)*percentile + 0.999999)
	for index, count := range s.Buckets {
		if count >= target {
			return latencyBuckets[index] * 1000
		}
	}
	return s.Max.Seconds() * 1000
}

type providerMetric struct {
	successes atomic.Uint64
	failures  atomic.Uint64
	timeouts  atomic.Uint64
	retries   atomic.Uint64
	latency   latencyHistogram
	mu        sync.RWMutex
	lastOK    time.Time
	lastError time.Time
}

type Metrics struct {
	requests        atomic.Uint64
	errors          atomic.Uint64
	bytes           atomic.Uint64
	manifestHits    atomic.Uint64
	manifestMisses  atomic.Uint64
	manifestShared  atomic.Uint64
	retries         atomic.Uint64
	timeouts        atomic.Uint64
	activeStreams   atomic.Int64
	requestLatency  latencyHistogram
	upstreamLatency latencyHistogram
	hostMu          sync.RWMutex
	hosts           map[string]*providerMetric
}

type HostHealth struct {
	Successes        uint64    `json:"successes"`
	Failures         uint64    `json:"failures"`
	Timeouts         uint64    `json:"timeouts"`
	Retries          uint64    `json:"retries"`
	AverageLatencyMS float64   `json:"averageLatencyMs"`
	P50LatencyMS     float64   `json:"p50LatencyMs"`
	P95LatencyMS     float64   `json:"p95LatencyMs"`
	P99LatencyMS     float64   `json:"p99LatencyMs"`
	MaxLatencyMS     float64   `json:"maxLatencyMs"`
	LastSuccess      time.Time `json:"lastSuccess,omitempty"`
	LastFailure      time.Time `json:"lastFailure,omitempty"`
}

func NewMetrics() *Metrics { return &Metrics{hosts: make(map[string]*providerMetric)} }

func (m *Metrics) provider(host string) *providerMetric {
	host = strings.ToLower(strings.TrimSpace(host))
	m.hostMu.RLock()
	item := m.hosts[host]
	m.hostMu.RUnlock()
	if item != nil {
		return item
	}
	m.hostMu.Lock()
	defer m.hostMu.Unlock()
	if item = m.hosts[host]; item == nil {
		item = &providerMetric{}
		m.hosts[host] = item
	}
	return item
}

func (m *Metrics) recordHost(host string, success, timedOut bool, duration time.Duration) {
	item := m.provider(host)
	item.latency.observe(duration)
	m.upstreamLatency.observe(duration)
	item.mu.Lock()
	if success {
		item.successes.Add(1)
		item.lastOK = time.Now().UTC()
	} else {
		item.failures.Add(1)
		item.lastError = time.Now().UTC()
	}
	if timedOut {
		item.timeouts.Add(1)
		m.timeouts.Add(1)
	}
	item.mu.Unlock()
}

func (m *Metrics) recordRetry(host string) {
	m.retries.Add(1)
	m.provider(host).retries.Add(1)
}

func (m *Metrics) recordRequest(duration time.Duration) {
	m.requestLatency.observe(duration)
}

func (m *Metrics) Hosts() map[string]HostHealth {
	m.hostMu.RLock()
	providers := make(map[string]*providerMetric, len(m.hosts))
	for host, item := range m.hosts {
		providers[host] = item
	}
	m.hostMu.RUnlock()

	result := make(map[string]HostHealth, len(providers))
	for host, item := range providers {
		snapshot := item.latency.snapshot()
		average := 0.0
		if snapshot.Count > 0 {
			average = float64(snapshot.Sum) / float64(snapshot.Count) / float64(time.Millisecond)
		}
		item.mu.RLock()
		result[host] = HostHealth{
			Successes: item.successes.Load(), Failures: item.failures.Load(),
			Timeouts: item.timeouts.Load(), Retries: item.retries.Load(),
			AverageLatencyMS: average, P50LatencyMS: snapshot.percentile(0.50),
			P95LatencyMS: snapshot.percentile(0.95), P99LatencyMS: snapshot.percentile(0.99),
			MaxLatencyMS: snapshot.Max.Seconds() * 1000,
			LastSuccess:  item.lastOK, LastFailure: item.lastError,
		}
		item.mu.RUnlock()
	}
	return result
}

func appendHistogram(lines []string, name string, snapshot histogramSnapshot) []string {
	for index, upperBound := range latencyBuckets {
		lines = append(lines, fmt.Sprintf("%s_bucket{le=%s} %d", name, strconv.Quote(strconv.FormatFloat(upperBound, 'f', -1, 64)), snapshot.Buckets[index]))
	}
	lines = append(lines,
		fmt.Sprintf("%s_bucket{le=\"+Inf\"} %d", name, snapshot.Count),
		fmt.Sprintf("%s_sum %s", name, strconv.FormatFloat(snapshot.Sum.Seconds(), 'f', 6, 64)),
		fmt.Sprintf("%s_count %d", name, snapshot.Count),
	)
	return lines
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
		"# TYPE netphim_media_manifest_singleflight_shared_total counter",
		fmt.Sprintf("netphim_media_manifest_singleflight_shared_total %d", m.manifestShared.Load()),
		"# TYPE netphim_media_upstream_retries_total counter",
		fmt.Sprintf("netphim_media_upstream_retries_total %d", m.retries.Load()),
		"# TYPE netphim_media_upstream_timeouts_total counter",
		fmt.Sprintf("netphim_media_upstream_timeouts_total %d", m.timeouts.Load()),
		"# TYPE netphim_media_request_duration_seconds histogram",
	}
	lines = appendHistogram(lines, "netphim_media_request_duration_seconds", m.requestLatency.snapshot())
	lines = append(lines, "# TYPE netphim_media_upstream_duration_seconds histogram")
	lines = appendHistogram(lines, "netphim_media_upstream_duration_seconds", m.upstreamLatency.snapshot())

	hosts := m.Hosts()
	hostNames := make([]string, 0, len(hosts))
	for host := range hosts {
		hostNames = append(hostNames, host)
	}
	sort.Strings(hostNames)
	for _, host := range hostNames {
		item := hosts[host]
		label := strconv.Quote(host)
		lines = append(lines,
			fmt.Sprintf("netphim_media_provider_successes_total{host=%s} %d", label, item.Successes),
			fmt.Sprintf("netphim_media_provider_failures_total{host=%s} %d", label, item.Failures),
			fmt.Sprintf("netphim_media_provider_timeouts_total{host=%s} %d", label, item.Timeouts),
			fmt.Sprintf("netphim_media_provider_retries_total{host=%s} %d", label, item.Retries),
			fmt.Sprintf("netphim_media_provider_latency_p95_milliseconds{host=%s} %s", label, strconv.FormatFloat(item.P95LatencyMS, 'f', 3, 64)),
		)
	}
	c.String(http.StatusOK, strings.Join(lines, "\n")+"\n")
}
