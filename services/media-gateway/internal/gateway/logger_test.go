package gateway

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestIDPreservesSafeValue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RequestID())
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, requestIDFromContext(c))
	})

	request := httptest.NewRequest(http.MethodGet, "/test", nil)
	request.Header.Set(requestIDHeader, "edge-123.valid")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Header().Get(requestIDHeader) != "edge-123.valid" || recorder.Body.String() != "edge-123.valid" {
		t.Fatalf("safe request ID was not propagated: header=%q body=%q", recorder.Header().Get(requestIDHeader), recorder.Body.String())
	}
}

func TestRequestIDReplacesUnsafeValue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RequestID())
	router.GET("/test", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	request := httptest.NewRequest(http.MethodGet, "/test", nil)
	request.Header.Set(requestIDHeader, "bad\nlog-entry")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	requestID := recorder.Header().Get(requestIDHeader)
	if !validRequestID(requestID) || requestID == "bad\nlog-entry" {
		t.Fatalf("unsafe request ID was not replaced: %q", requestID)
	}
}
