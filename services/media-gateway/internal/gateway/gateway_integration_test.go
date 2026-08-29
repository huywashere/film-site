package gateway

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/netphim/media-gateway/internal/config"
	"github.com/netphim/media-gateway/internal/store"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

type testTimeoutError struct{}

func (testTimeoutError) Error() string   { return "test timeout" }
func (testTimeoutError) Timeout() bool   { return true }
func (testTimeoutError) Temporary() bool { return true }

func newTestGateway(t *testing.T, transport http.RoundTripper) (*Gateway, *gin.Engine) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	cfg := config.Config{
		Environment:      "debug",
		SigningSecret:    "test-only-hls-secret-with-at-least-32-characters",
		InternalToken:    "test-only-internal-token-at-least-32-characters",
		AllowedHosts:     []string{"media.test"},
		RequestTimeout:   500 * time.Millisecond,
		ManifestCacheTTL: time.Minute,
		RatePerSecond:    1_000,
		RateBurst:        1_000,
		MaxManifestBytes: 1_024,
		MaxResolveBytes:  256,
		MaxRedirects:     2,
		RetryAttempts:    2,
		RetryBackoff:     time.Millisecond,
	}
	gateway := New(cfg, store.NewMemoryManifestStore(time.Minute))
	gateway.client = &http.Client{Transport: transport}
	gateway.guard.ResolveIP = func(context.Context, string) ([]net.IP, error) {
		return []net.IP{net.ParseIP("8.8.8.8")}, nil
	}
	router := gin.New()
	gateway.Register(router)
	return gateway, router
}

func upstreamResponse(request *http.Request, status int, contentType, body string) *http.Response {
	return &http.Response{
		StatusCode:    status,
		Header:        http.Header{"Content-Type": []string{contentType}},
		Body:          io.NopCloser(strings.NewReader(body)),
		ContentLength: int64(len(body)),
		Request:       request,
	}
}

func signedRequest(gateway *Gateway, target string) *http.Request {
	return httptest.NewRequest(http.MethodGet, gateway.signer.SignedProxyURL(target), nil)
}

func TestConcurrentManifestMissesUseOneUpstreamRequest(t *testing.T) {
	var requests atomic.Int32
	gateway, router := newTestGateway(t, roundTripFunc(func(request *http.Request) (*http.Response, error) {
		requests.Add(1)
		time.Sleep(75 * time.Millisecond)
		return upstreamResponse(request, http.StatusOK, "application/vnd.apple.mpegurl", "#EXTM3U\n#EXTINF:6,\nsegment-1.ts\n"), nil
	}))

	const clients = 20
	start := make(chan struct{})
	errors := make(chan error, clients)
	var waitGroup sync.WaitGroup
	for index := 0; index < clients; index++ {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			<-start
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, signedRequest(gateway, "https://media.test/movie/master.m3u8"))
			if recorder.Code != http.StatusOK {
				errors <- fmt.Errorf("unexpected status %d: %s", recorder.Code, recorder.Body.String())
			}
		}()
	}
	close(start)
	waitGroup.Wait()
	close(errors)
	for err := range errors {
		t.Error(err)
	}
	if actual := requests.Load(); actual != 1 {
		t.Fatalf("expected one coalesced upstream request, got %d", actual)
	}
	if gateway.metrics.manifestShared.Load() == 0 {
		t.Fatal("expected singleflight sharing to be recorded")
	}
}

func TestRangeRequestIsForwardedAndRetryableFailureRecovers(t *testing.T) {
	var requests atomic.Int32
	var rangesMu sync.Mutex
	var ranges []string
	gateway, router := newTestGateway(t, roundTripFunc(func(request *http.Request) (*http.Response, error) {
		attempt := requests.Add(1)
		rangesMu.Lock()
		ranges = append(ranges, request.Header.Get("Range"))
		rangesMu.Unlock()
		if attempt == 1 {
			return upstreamResponse(request, http.StatusServiceUnavailable, "text/plain", "retry"), nil
		}
		response := upstreamResponse(request, http.StatusPartialContent, "video/mp2t", "segment-data")
		response.Header.Set("Content-Range", "bytes 10-21/100")
		response.Header.Set("Accept-Ranges", "bytes")
		return response, nil
	}))

	request := signedRequest(gateway, "https://media.test/movie/segment-1.ts")
	request.Header.Set("Range", "bytes=10-21")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusPartialContent {
		t.Fatalf("unexpected status %d: %s", recorder.Code, recorder.Body.String())
	}
	if recorder.Header().Get("Content-Range") != "bytes 10-21/100" {
		t.Fatalf("content range was not preserved: %q", recorder.Header().Get("Content-Range"))
	}
	if requests.Load() != 2 || len(ranges) != 2 || ranges[0] != "bytes=10-21" || ranges[1] != "bytes=10-21" {
		t.Fatalf("range was not preserved across retry: requests=%d ranges=%v", requests.Load(), ranges)
	}
	if gateway.metrics.retries.Load() != 1 {
		t.Fatalf("expected one retry metric, got %d", gateway.metrics.retries.Load())
	}
}

func TestOversizedManifestIsRejected(t *testing.T) {
	gateway, router := newTestGateway(t, roundTripFunc(func(request *http.Request) (*http.Response, error) {
		body := "#EXTM3U\n" + strings.Repeat("x", 2_048)
		return upstreamResponse(request, http.StatusOK, "application/vnd.apple.mpegurl", body), nil
	}))

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, signedRequest(gateway, "https://media.test/movie/master.m3u8"))
	if recorder.Code != http.StatusBadGateway {
		t.Fatalf("expected oversized manifest rejection, got %d", recorder.Code)
	}
}

func TestTransientTimeoutIsRetriedAndMeasured(t *testing.T) {
	var requests atomic.Int32
	gateway, router := newTestGateway(t, roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if requests.Add(1) == 1 {
			return nil, testTimeoutError{}
		}
		return upstreamResponse(request, http.StatusOK, "video/mp2t", "segment-data"), nil
	}))

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, signedRequest(gateway, "https://media.test/movie/segment.ts"))
	if recorder.Code != http.StatusOK {
		t.Fatalf("timeout retry did not recover: status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if gateway.metrics.timeouts.Load() != 1 || gateway.metrics.retries.Load() != 1 {
		t.Fatalf("unexpected timeout/retry metrics: timeouts=%d retries=%d", gateway.metrics.timeouts.Load(), gateway.metrics.retries.Load())
	}
}

func TestResolveStreamRejectsOversizedJSON(t *testing.T) {
	gateway, router := newTestGateway(t, roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return upstreamResponse(request, http.StatusOK, "video/mp2t", "unused"), nil
	}))
	body := strings.NewReader(`{"url":"https://media.test/` + strings.Repeat("x", 512) + `"}`)
	request := httptest.NewRequest(http.MethodPost, "/v1/streams/resolve", body)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Media-Internal-Token", gateway.cfg.InternalToken)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413 for oversized resolve body, got %d: %s", recorder.Code, recorder.Body.String())
	}
}

func TestMetricsExposeLatencyAndProviderSeries(t *testing.T) {
	gateway, router := newTestGateway(t, roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return upstreamResponse(request, http.StatusOK, "video/mp2t", "segment-data"), nil
	}))

	mediaRecorder := httptest.NewRecorder()
	router.ServeHTTP(mediaRecorder, signedRequest(gateway, "https://media.test/movie/segment.ts"))
	metricsRequest := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	metricsRequest.Header.Set("X-Media-Internal-Token", gateway.cfg.InternalToken)
	metricsRecorder := httptest.NewRecorder()
	router.ServeHTTP(metricsRecorder, metricsRequest)

	if metricsRecorder.Code != http.StatusOK {
		t.Fatalf("unexpected metrics status %d", metricsRecorder.Code)
	}
	for _, expected := range []string{
		"netphim_media_request_duration_seconds_bucket",
		"netphim_media_upstream_duration_seconds_bucket",
		"netphim_media_provider_successes_total{host=\"media.test\"} 1",
	} {
		if !strings.Contains(metricsRecorder.Body.String(), expected) {
			t.Fatalf("metrics output missing %q", expected)
		}
	}
}
