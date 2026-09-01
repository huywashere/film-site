package gateway

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/netphim/media-gateway/internal/store"
)

// registerAnalysisRoutes wires analysis endpoints onto the router.
// All routes require the internal token.
func (g *Gateway) registerAnalysisRoutes(router *gin.Engine) {
	if g.results == nil {
		return
	}
	internal := router.Group("/v1/analysis", g.requireInternalToken())
	internal.GET("/result", g.analysisResultHandler)
	internal.GET("/status", g.analysisStatusHandler)
	internal.POST("/enqueue", g.analysisEnqueueHandler)
}

// analysisResultHandler returns the cached analysis result for an HLS URL.
//
//	GET /v1/analysis/result?url=<hls_url>
func (g *Gateway) analysisResultHandler(c *gin.Context) {
	rawURL := c.Query("url")
	if rawURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	result, ok := g.results.GetResult(ctx, rawURL)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "not_found"})
		return
	}
	c.JSON(http.StatusOK, result)
}

// analysisStatusHandler checks whether an analysis result exists for a URL.
//
//	GET /v1/analysis/status?url=<hls_url>
func (g *Gateway) analysisStatusHandler(c *gin.Context) {
	rawURL := c.Query("url")
	if rawURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	_, ok := g.results.GetResult(ctx, rawURL)
	if !ok {
		c.JSON(http.StatusOK, gin.H{"status": "not_found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "done"})
}

// analysisEnqueueHandler manually enqueues an HLS analysis job.
//
//	POST /v1/analysis/enqueue
//	Body: {"url":"...","provider":"kkphim","movieSlug":"...","episode":"1"}
func (g *Gateway) analysisEnqueueHandler(c *gin.Context) {
	if g.analysis == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "analysis queue not configured"})
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16*1024)
	var input struct {
		URL       string `json:"url" binding:"required"`
		Provider  string `json:"provider"`
		MovieSlug string `json:"movieSlug"`
		Episode   string `json:"episode"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	target, err := g.guard.Validate(c.Request.Context(), input.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	job := store.NewAnalysisJob(target.String(), input.Provider)
	job.MovieSlug = input.MovieSlug
	job.Episode = input.Episode
	job.TraceID = requestIDFromContext(c)
	ctx, cancel := context.WithTimeout(c.Request.Context(), g.cfg.AnalysisTimeout)
	defer cancel()
	if err := g.analysis.Enqueue(ctx, job); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "enqueue failed"})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"jobId": job.JobID, "queued": true})
}
