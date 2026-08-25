package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

var defaultAllowedHosts = []string{
	"*.phimapi.com",
	"*.phim1280.tv",
	"*.kkphimplayer*.com",
	"*.ophim.live",
	"*.ophim1.com",
	"*.opstream*.com",
	"*.nguonc.com",
	"*.streamc.xyz",
	"*.hihihoho*.top",
	"*.vsmov.com",
	"*.streamvsmov.com",
}

type Config struct {
	Port             string
	Environment      string
	SigningSecret    string
	InternalToken    string
	AllowedHosts     []string
	RedisURL         string
	RequestTimeout   time.Duration
	ManifestCacheTTL time.Duration
	RatePerSecond    int
	RateBurst        int
	MaxManifestBytes int64
	MaxRedirects     int
}

func Load() (Config, error) {
	cfg := Config{
		Port:             env("PORT", "8081"),
		Environment:      env("GIN_MODE", "release"),
		SigningSecret:    strings.TrimSpace(os.Getenv("HLS_PROXY_SECRET")),
		InternalToken:    strings.TrimSpace(os.Getenv("MEDIA_INTERNAL_TOKEN")),
		RedisURL:         strings.TrimSpace(os.Getenv("REDIS_URL")),
		RequestTimeout:   durationEnv("MEDIA_UPSTREAM_TIMEOUT", 15*time.Second),
		ManifestCacheTTL: durationEnv("MEDIA_MANIFEST_CACHE_TTL", 20*time.Second),
		RatePerSecond:    intEnv("MEDIA_RATE_PER_SECOND", 40),
		RateBurst:        intEnv("MEDIA_RATE_BURST", 80),
		MaxManifestBytes: int64(intEnv("MEDIA_MAX_MANIFEST_BYTES", 4*1024*1024)),
		MaxRedirects:     intEnv("MEDIA_MAX_REDIRECTS", 3),
	}

	if len(cfg.SigningSecret) < 32 {
		return Config{}, fmt.Errorf("HLS_PROXY_SECRET must contain at least 32 characters")
	}
	if cfg.Environment == "release" && len(cfg.InternalToken) < 32 {
		return Config{}, fmt.Errorf("MEDIA_INTERNAL_TOKEN must contain at least 32 characters in release mode")
	}

	configuredHosts := splitCSV(os.Getenv("HLS_PROXY_ALLOWED_HOSTS"))
	if len(configuredHosts) == 0 {
		cfg.AllowedHosts = defaultAllowedHosts
	} else {
		cfg.AllowedHosts = configuredHosts
	}
	return cfg, nil
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func intEnv(key string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(os.Getenv(key)))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func splitCSV(value string) []string {
	var result []string
	for _, item := range strings.Split(value, ",") {
		item = strings.ToLower(strings.TrimSpace(item))
		if item != "" {
			result = append(result, item)
		}
	}
	return result
}
