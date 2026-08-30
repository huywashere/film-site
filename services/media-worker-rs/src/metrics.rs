use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

use axum::{extract::State, http::StatusCode, response::IntoResponse};

#[derive(Default)]
pub struct Metrics {
    pub ready: AtomicBool,
    pub jobs_total: AtomicU64,
    pub jobs_failed: AtomicU64,
    pub manifests_playable: AtomicU64,
    pub redis_errors: AtomicU64,
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
    let body = format!(
        concat!(
            "# TYPE netphim_hls_analyzer_jobs_total counter\n",
            "netphim_hls_analyzer_jobs_total {}\n",
            "# TYPE netphim_hls_analyzer_jobs_failed_total counter\n",
            "netphim_hls_analyzer_jobs_failed_total {}\n",
            "# TYPE netphim_hls_analyzer_playable_total counter\n",
            "netphim_hls_analyzer_playable_total {}\n",
            "# TYPE netphim_hls_analyzer_redis_errors_total counter\n",
            "netphim_hls_analyzer_redis_errors_total {}\n"
        ),
        metrics.jobs_total.load(Ordering::Relaxed),
        metrics.jobs_failed.load(Ordering::Relaxed),
        metrics.manifests_playable.load(Ordering::Relaxed),
        metrics.redis_errors.load(Ordering::Relaxed),
    );
    (StatusCode::OK, body)
}
