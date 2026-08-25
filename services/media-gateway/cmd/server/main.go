package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/netphim/media-gateway/internal/config"
	"github.com/netphim/media-gateway/internal/gateway"
	"github.com/netphim/media-gateway/internal/store"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
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

	router := gin.New()
	router.Use(gin.Recovery())
	gateway.New(cfg, manifestStore).Register(router)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
