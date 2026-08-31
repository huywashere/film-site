package gateway

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware returns a Gin middleware that adds CORS response headers when
// the request Origin is in the allowed list. If allowedOrigins is empty the
// middleware is a no-op (safe default for behind-nginx deployments).
//
// Configure via MEDIA_CORS_ORIGINS (comma-separated list of origins).
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	if len(allowedOrigins) == 0 {
		return func(c *gin.Context) { c.Next() }
	}
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.ToLower(strings.TrimSpace(o))] = struct{}{}
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			c.Next()
			return
		}
		if _, ok := allowed[strings.ToLower(origin)]; ok {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, X-Media-Internal-Token")
			c.Header("Access-Control-Max-Age", "86400")
			c.Header("Vary", "Origin")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
