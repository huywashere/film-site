package gateway

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

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
		slog.Log(c.Request.Context(), level, "request",
			"method", c.Request.Method,
			"path", c.FullPath(),
			"raw_path", c.Request.URL.RequestURI(),
			"status", status,
			"latency_ms", latency.Milliseconds(),
			"client_ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
		)
	}
}
