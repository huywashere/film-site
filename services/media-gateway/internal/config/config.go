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
	"vicdn.cc",
	"*.vicdn.cc",
}

var defaultTrustedProxies = []string{
	"127.0.0.1/32",
	"::1/128",
	"10.0.0.0/8",
	"172.16.0.0/12",
	"192.168.0.0/16",
}

type Config struct {
	Port              string
	Environment       string
	SigningSecret     string
	InternalToken     string
	AllowedHosts      []string
	RedisURL          string
	RequestTimeout    time.Duration
	ManifestCacheTTL  time.Duration
	RatePerSecond     int
	RateBurst         int
	MaxManifestBytes  int64
	MaxResolveBytes   int64
	MaxRedirects      int
	RetryAttempts     int
	RetryBackoff      time.Duration
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
	MaxHeaderBytes    int
	TrustedProxies    []string
	CatalogEnabled    bool
	CatalogTimeout    time.Duration
	CatalogCacheTTL   time.Duration
	CatalogSearchTTL  time.Duration
	CatalogListTTL    time.Duration
	CatalogMaxBytes   int64
	CoreAPIURL        string
	KKPhimOrigins     []string
	OPhimOrigins      []string
	NguonCOrigins     []string
	VSMovOrigins      []string
	ViCDNOrigins      []string
}

func Load() (Config, error) {
	cfg := Config{
		Port:              env("PORT", "8081"),
		Environment:       env("GIN_MODE", "release"),
		SigningSecret:     strings.TrimSpace(os.Getenv("HLS_PROXY_SECRET")),
		InternalToken:     strings.TrimSpace(os.Getenv("MEDIA_INTERNAL_TOKEN")),
		RedisURL:          strings.TrimSpace(os.Getenv("REDIS_URL")),
		RequestTimeout:    durationEnv("MEDIA_UPSTREAM_TIMEOUT", 15*time.Second),
		ManifestCacheTTL:  durationEnv("MEDIA_MANIFEST_CACHE_TTL", 20*time.Second),
		RatePerSecond:     intEnv("MEDIA_RATE_PER_SECOND", 40),
		RateBurst:         intEnv("MEDIA_RATE_BURST", 80),
		MaxManifestBytes:  int64(intEnv("MEDIA_MAX_MANIFEST_BYTES", 4*1024*1024)),
		MaxResolveBytes:   int64(intEnv("MEDIA_MAX_RESOLVE_BYTES", 16*1024)),
		MaxRedirects:      intEnv("MEDIA_MAX_REDIRECTS", 3),
		RetryAttempts:     boundedIntEnv("MEDIA_RETRY_ATTEMPTS", 2, 1, 3),
		RetryBackoff:      durationEnv("MEDIA_RETRY_BACKOFF", 150*time.Millisecond),
		ReadHeaderTimeout: durationEnv("MEDIA_SERVER_READ_HEADER_TIMEOUT", 5*time.Second),
		ReadTimeout:       durationEnv("MEDIA_SERVER_READ_TIMEOUT", 15*time.Second),
		WriteTimeout:      durationEnv("MEDIA_SERVER_WRITE_TIMEOUT", 5*time.Minute),
		IdleTimeout:       durationEnv("MEDIA_SERVER_IDLE_TIMEOUT", 90*time.Second),
		ShutdownTimeout:   durationEnv("MEDIA_SHUTDOWN_TIMEOUT", 25*time.Second),
		MaxHeaderBytes:    intEnv("MEDIA_SERVER_MAX_HEADER_BYTES", 32*1024),
		CatalogEnabled:    boolEnv("MEDIA_CATALOG_ENABLED", true),
		CatalogTimeout:    durationEnv("MEDIA_CATALOG_TIMEOUT", 3*time.Second),
		CatalogCacheTTL:   durationEnv("MEDIA_CATALOG_DETAIL_TTL", 10*time.Minute),
		CatalogSearchTTL:  durationEnv("MEDIA_CATALOG_SEARCH_TTL", 5*time.Minute),
		CatalogListTTL:    durationEnv("MEDIA_CATALOG_LIST_TTL", 2*time.Minute),
		CatalogMaxBytes:   int64(intEnv("MEDIA_CATALOG_MAX_BYTES", 8*1024*1024)),
		CoreAPIURL:        strings.TrimRight(env("CORE_API_URL", "http://api:4000/api/v1"), "/"),
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
	configuredProxies := splitCSV(os.Getenv("MEDIA_TRUSTED_PROXIES"))
	if len(configuredProxies) == 0 {
		cfg.TrustedProxies = defaultTrustedProxies
	} else {
		cfg.TrustedProxies = configuredProxies
	}
	cfg.KKPhimOrigins = originPool("KKPHIM_API_ORIGINS", "https://phimapi.com")
	cfg.OPhimOrigins = originPool("OPHIM_API_ORIGINS", "https://ophim1.com")
	cfg.NguonCOrigins = originPool("NGUONC_API_ORIGINS", "https://phim.nguonc.com/api")
	cfg.VSMovOrigins = originPool("VSMOV_API_ORIGINS", "https://vsmov.com/api")
	cfg.ViCDNOrigins = originPool("VICDN_API_ORIGINS", "https://vicdn.cc/api")
	return cfg, nil
}

func boolEnv(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func originPool(key, fallback string) []string {
	configured := splitCSV(os.Getenv(key))
	if len(configured) == 0 {
		return []string{fallback}
	}
	return configured
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

func boundedIntEnv(key string, fallback, minimum, maximum int) int {
	value := intEnv(key, fallback)
	if value < minimum || value > maximum {
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
