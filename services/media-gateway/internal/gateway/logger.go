package gateway

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const requestIDHeader = "X-Request-ID"

// RequestID attaches one safe correlation identifier to the request and
// response. Existing IDs are accepted only when they contain conservative
// printable characters, preventing log injection from an untrusted header.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := strings.TrimSpace(c.GetHeader(requestIDHeader))
		if !validRequestID(requestID) {
			requestID = newRequestID()
		}
		c.Set("request_id", requestID)
		c.Request.Header.Set(requestIDHeader, requestID)
		c.Header(requestIDHeader, requestID)
		c.Next()
	}
}

func requestIDFromContext(c *gin.Context) string {
	if value, ok := c.Get("request_id"); ok {
		if requestID, ok := value.(string); ok {
			return requestID
		}
	}
	return ""
}

func validRequestID(value string) bool {
	if value == "" || len(value) > 128 {
		return false
	}
	for _, char := range value {
		if !((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') || char == '-' || char == '_' || char == '.') {
			return false
		}
	}
	return true
}

func newRequestID() string {
	var value [16]byte
	if _, err := rand.Read(value[:]); err == nil {
		return hex.EncodeToString(value[:])
	}
	return "req-" + time.Now().UTC().Format("20060102150405.000000000")
}

// RequestLogger returns a Gin middleware that emits a structured log line for
// every request using the standard library slog package (Go 1.21+).
// Fields: method, path, status, latency_ms, client_ip, user_agent.
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		started := time.Now()
		c.Next()
		latency := time.Since(started)
		status := c.Writer.Status()
		level := slog.LevelInfo
		if status >= 500 {
			level = slog.LevelError
		} else if status >= 400 {
			level = slog.LevelWarn
		}
		// Never log RequestURI here. HLS routes contain signed upstream URLs in
		// their query string, and logging them would leak reusable credentials.
		slog.Log(c.Request.Context(), level, "request",
			"request_id", requestIDFromContext(c),
			"method", c.Request.Method,
			"path", c.FullPath(),
			"status", status,
			"latency_ms", latency.Milliseconds(),
			"client_ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
		)
	}
}
