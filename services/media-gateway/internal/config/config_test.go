package config

import (
	"slices"
	"testing"
	"time"
)

func TestLoadUsesProductionHardeningDefaults(t *testing.T) {
	t.Setenv("GIN_MODE", "release")
	t.Setenv("HLS_PROXY_SECRET", "test-only-hls-secret-with-at-least-32-characters")
	t.Setenv("MEDIA_INTERNAL_TOKEN", "test-only-internal-token-at-least-32-characters")
	t.Setenv("HLS_PROXY_ALLOWED_HOSTS", "")
	t.Setenv("MEDIA_TRUSTED_PROXIES", "")
	t.Setenv("MEDIA_RETRY_ATTEMPTS", "")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.RetryAttempts != 2 || cfg.RetryBackoff != 150*time.Millisecond {
		t.Fatalf("unexpected retry defaults: attempts=%d backoff=%s", cfg.RetryAttempts, cfg.RetryBackoff)
	}
	if cfg.ReadHeaderTimeout != 5*time.Second || cfg.WriteTimeout != 5*time.Minute || cfg.ShutdownTimeout != 25*time.Second {
		t.Fatalf("unexpected server timeout defaults: %+v", cfg)
	}
	if !slices.Contains(cfg.AllowedHosts, "*.vicdn.cc") {
		t.Fatal("ViCDN wildcard is missing from the default media allowlist")
	}
	if len(cfg.TrustedProxies) == 0 {
		t.Fatal("trusted reverse proxy defaults must not be empty")
	}
	if cfg.CoreAPIURL != "http://api:4000/api/v1" {
		t.Fatalf("media gateway must use the NestJS container port, got %s", cfg.CoreAPIURL)
	}
}

func TestRetryAttemptsAreBounded(t *testing.T) {
	t.Setenv("GIN_MODE", "debug")
	t.Setenv("HLS_PROXY_SECRET", "test-only-hls-secret-with-at-least-32-characters")
	t.Setenv("MEDIA_RETRY_ATTEMPTS", "99")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.RetryAttempts != 2 {
		t.Fatalf("out-of-range retry count should fall back to 2, got %d", cfg.RetryAttempts)
	}
}
