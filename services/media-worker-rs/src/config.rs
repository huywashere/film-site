use std::{env, time::Duration};

use anyhow::{anyhow, bail, Context, Result};

#[derive(Clone, Debug)]
pub struct Config {
    pub redis_url: String,
    pub job_stream: String,
    pub result_stream: String,
    pub dead_letter_stream: String,
    pub consumer_group: String,
    pub consumer_name: String,
    pub result_prefix: String,
    pub result_ttl_seconds: u64,
    pub concurrency: usize,
    pub request_timeout: Duration,
    pub max_manifest_bytes: usize,
    pub segment_sample_size: usize,
    pub health_port: u16,
    pub allowed_hosts: Vec<String>,
    pub require_https: bool,
    /// How long to wait for in-flight workers before force-aborting on shutdown.
    pub shutdown_timeout: Duration,
    /// How many times to retry a failed analysis before writing a failed result.
    pub retry_attempts: usize,
    /// Base backoff between retries in milliseconds (doubles each attempt).
    pub retry_backoff_ms: u64,
    /// Pending jobs older than this are reclaimed from crashed consumers.
    pub reclaim_idle: Duration,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let environment = value("RUST_LOG", "info");
        if env::var("RUST_LOG").is_err() {
            env::set_var("RUST_LOG", environment);
        }

        let allowed_hosts = csv("HLS_ANALYZER_ALLOWED_HOSTS");
        if allowed_hosts.is_empty() {
            bail!("HLS_ANALYZER_ALLOWED_HOSTS must contain at least one trusted host pattern");
        }

        Ok(Self {
            redis_url: required("REDIS_URL")?,
            job_stream: value("HLS_ANALYZER_JOB_STREAM", "netphim:hls:analysis:jobs"),
            result_stream: value("HLS_ANALYZER_RESULT_STREAM", "netphim:hls:analysis:results"),
            dead_letter_stream: value(
                "HLS_ANALYZER_DEAD_LETTER_STREAM",
                "netphim:hls:analysis:dead-letter",
            ),
            consumer_group: value("HLS_ANALYZER_CONSUMER_GROUP", "hls-analyzers"),
            consumer_name: value(
                "HLS_ANALYZER_CONSUMER",
                &format!(
                    "media-worker-{}-{}",
                    env::var("HOSTNAME").unwrap_or_else(|_| "local".to_owned()),
                    std::process::id()
                ),
            ),
            result_prefix: value("HLS_ANALYZER_RESULT_PREFIX", "netphim:hls:analysis:v1:"),
            result_ttl_seconds: number("HLS_ANALYZER_RESULT_TTL_SECONDS", 21_600)?,
            concurrency: number::<usize>("HLS_ANALYZER_CONCURRENCY", 2)?.clamp(1, 8),
            request_timeout: Duration::from_millis(number("HLS_ANALYZER_TIMEOUT_MS", 8_000)?),
            max_manifest_bytes: number::<usize>(
                "HLS_ANALYZER_MAX_MANIFEST_BYTES",
                2 * 1024 * 1024,
            )?
            .clamp(64 * 1024, 8 * 1024 * 1024),
            segment_sample_size: number::<usize>("HLS_ANALYZER_SEGMENT_SAMPLES", 3)?.clamp(0, 8),
            health_port: number("HLS_ANALYZER_HEALTH_PORT", 8091)?,
            allowed_hosts,
            require_https: boolean("HLS_ANALYZER_REQUIRE_HTTPS", true),
            shutdown_timeout: Duration::from_secs(number(
                "HLS_ANALYZER_SHUTDOWN_TIMEOUT_SECS",
                30,
            )?),
            retry_attempts: number::<usize>("HLS_ANALYZER_RETRY_ATTEMPTS", 3)?.clamp(1, 5),
            retry_backoff_ms: number("HLS_ANALYZER_RETRY_BACKOFF_MS", 2_000)?,
            reclaim_idle: Duration::from_millis(number("HLS_ANALYZER_RECLAIM_IDLE_MS", 60_000)?),
        })
    }
}

fn required(key: &str) -> Result<String> {
    let result = env::var(key)
        .with_context(|| format!("{key} is required"))?
        .trim()
        .to_owned();
    if result.is_empty() {
        bail!("{key} is required");
    }
    Ok(result)
}

fn value(key: &str, fallback: &str) -> String {
    env::var(key)
        .ok()
        .map(|item| item.trim().to_owned())
        .filter(|item| !item.is_empty())
        .unwrap_or_else(|| fallback.to_owned())
}

fn csv(key: &str) -> Vec<String> {
    env::var(key)
        .unwrap_or_default()
        .split(',')
        .map(|item| item.trim().to_ascii_lowercase())
        .filter(|item| !item.is_empty())
        .collect()
}

fn number<T>(key: &str, fallback: T) -> Result<T>
where
    T: std::str::FromStr + Copy,
    T::Err: std::fmt::Display,
{
    match env::var(key) {
        Ok(raw) if !raw.trim().is_empty() => raw
            .trim()
            .parse::<T>()
            .map_err(|error| anyhow!("{key} is invalid: {error}")),
        _ => Ok(fallback),
    }
}

fn boolean(key: &str, fallback: bool) -> bool {
    env::var(key)
        .ok()
        .and_then(|raw| raw.trim().parse::<bool>().ok())
        .unwrap_or(fallback)
}
