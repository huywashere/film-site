use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

use axum::{extract::State, http::StatusCode, response::IntoResponse};

#[derive(Default)]
pub struct Metrics {
    pub ready: AtomicBool,
    pub jobs_total: AtomicU64,
    pub jobs_failed: AtomicU64,
    pub manifests_playable: AtomicU64,
    pub redis_errors: AtomicU64,
    /// Sum of analysis durations in milliseconds (for computing mean).
    pub analysis_duration_ms_sum: AtomicU64,
    /// Number of completed analyses (successful + failed).
    pub analysis_duration_ms_count: AtomicU64,
    /// Maximum analysis duration observed (milliseconds).
    pub analysis_duration_ms_max: AtomicU64,
}

impl Metrics {
    /// Record an analysis duration. Call after every job, regardless of outcome.
    pub fn record_duration(&self, duration_ms: u64) {
        self.analysis_duration_ms_sum
            .fetch_add(duration_ms, Ordering::Relaxed);
        self.analysis_duration_ms_count
            .fetch_add(1, Ordering::Relaxed);
        // Relaxed CAS loop to track max.
        let mut current = self.analysis_duration_ms_max.load(Ordering::Relaxed);
        while duration_ms > current {
            match self.analysis_duration_ms_max.compare_exchange_weak(
                current,
                duration_ms,
                Ordering::Relaxed,
                Ordering::Relaxed,
            ) {
                Ok(_) => break,
                Err(actual) => current = actual,
            }
        }
    }
}

pub async fn healthz() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

pub async fn readyz(State(metrics): State<std::sync::Arc<Metrics>>) -> impl IntoResponse {
    if metrics.ready.load(Ordering::Relaxed) {
        (StatusCode::OK, "ready")
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, "not ready")
    }
}

pub async fn prometheus(State(metrics): State<std::sync::Arc<Metrics>>) -> impl IntoResponse {
    let count = metrics.analysis_duration_ms_count.load(Ordering::Relaxed);
    let sum = metrics.analysis_duration_ms_sum.load(Ordering::Relaxed);
    let max = metrics.analysis_duration_ms_max.load(Ordering::Relaxed);
    let mean = if count > 0 { sum / count } else { 0 };
    let body = format!(
        concat!(
            "# TYPE netphim_hls_analyzer_jobs_total counter\n",
            "netphim_hls_analyzer_jobs_total {}\n",
            "# TYPE netphim_hls_analyzer_jobs_failed_total counter\n",
            "netphim_hls_analyzer_jobs_failed_total {}\n",
            "# TYPE netphim_hls_analyzer_playable_total counter\n",
            "netphim_hls_analyzer_playable_total {}\n",
            "# TYPE netphim_hls_analyzer_redis_errors_total counter\n",
            "netphim_hls_analyzer_redis_errors_total {}\n",
            "# TYPE netphim_hls_analyzer_duration_ms_mean gauge\n",
            "netphim_hls_analyzer_duration_ms_mean {}\n",
            "# TYPE netphim_hls_analyzer_duration_ms_max gauge\n",
            "netphim_hls_analyzer_duration_ms_max {}\n",
            "# TYPE netphim_hls_analyzer_duration_ms_sum counter\n",
            "netphim_hls_analyzer_duration_ms_sum {}\n",
            "# TYPE netphim_hls_analyzer_duration_count counter\n",
            "netphim_hls_analyzer_duration_count {}\n"
        ),
        metrics.jobs_total.load(Ordering::Relaxed),
        metrics.jobs_failed.load(Ordering::Relaxed),
        metrics.manifests_playable.load(Ordering::Relaxed),
        metrics.redis_errors.load(Ordering::Relaxed),
        mean,
        max,
        sum,
        count,
    );
    (StatusCode::OK, body)
}
