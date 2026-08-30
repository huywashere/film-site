package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"github.com/netphim/media-gateway/internal/config"
	"github.com/netphim/media-gateway/internal/gateway"
	"github.com/netphim/media-gateway/internal/store"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	gin.SetMode(cfg.Environment)

	var manifestStore store.ManifestStore = store.NewMemoryManifestStore(cfg.ManifestCacheTTL)
	if cfg.RedisURL != "" {
		redisStore, redisErr := store.NewRedisManifestStore(cfg.RedisURL, cfg.ManifestCacheTTL)
		if redisErr != nil {
			log.Printf("redis disabled: %v", redisErr)
		} else {
			manifestStore = redisStore
		}
	}
	defer func() {
		if err := manifestStore.Close(); err != nil {
			log.Printf("manifest store close failed: %v", err)
		}
	}()

	var analysisQueue store.AnalysisQueue
	if cfg.AnalysisEnabled && cfg.RedisURL != "" {
		redisQueue, queueErr := store.NewRedisAnalysisQueue(
			cfg.RedisURL,
			cfg.AnalysisJobStream,
			cfg.AnalysisQueueTTL,
		)
		if queueErr != nil {
			log.Printf("HLS analysis queue disabled: %v", queueErr)
		} else {
			analysisQueue = redisQueue
			defer func() {
				if err := redisQueue.Close(); err != nil {
					log.Printf("HLS analysis queue close failed: %v", err)
				}
			}()
		}
	}

	router := gin.New()
	router.Use(gin.Recovery())
	if err := router.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		return err
	}
	mediaGateway := gateway.New(cfg, manifestStore, analysisQueue)
	defer mediaGateway.Close()
	mediaGateway.Register(router)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
		MaxHeaderBytes:    cfg.MaxHeaderBytes,
	}

	serverErrors := make(chan error, 1)
	go func() {
		log.Printf("media gateway listening on %s", server.Addr)
		serverErrors <- server.ListenAndServe()
	}()

	rootContext, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-rootContext.Done():
		log.Printf("shutdown signal received; draining active requests for up to %s", cfg.ShutdownTimeout)
	}

	shutdownContext, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		_ = server.Close()
		return err
	}
	if err := <-serverErrors; err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
