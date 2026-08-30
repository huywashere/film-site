mod analyzer;
mod config;
mod metrics;
mod models;
mod redis_queue;

use std::{sync::Arc, time::Duration};

use anyhow::{Context, Result};
use axum::{routing::get, Router};
use config::Config;
use metrics::Metrics;
use tracing::{info, warn};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
    if std::env::args().nth(1).as_deref() == Some("healthcheck") {
        let port = std::env::var("HLS_ANALYZER_HEALTH_PORT").unwrap_or_else(|_| "8091".to_owned());
        reqwest::get(format!("http://127.0.0.1:{port}/healthz"))
            .await?
            .error_for_status()?;
        return Ok(());
    }

    init_tracing();
    let config = Arc::new(Config::from_env()?);
    let metrics = Arc::new(Metrics::default());
    let analyzer = analyzer::Analyzer::new(config.clone())?;

    let health_metrics = metrics.clone();
    let health_address = format!("0.0.0.0:{}", config.health_port);
    let health_server = tokio::spawn(async move {
        let app = Router::new()
            .route("/healthz", get(metrics::healthz))
            .route("/readyz", get(metrics::readyz))
            .route("/metrics", get(metrics::prometheus))
            .with_state(health_metrics);
        let listener = tokio::net::TcpListener::bind(&health_address)
            .await
            .with_context(|| format!("cannot bind health server to {health_address}"))?;
        axum::serve(listener, app)
            .await
            .context("health server failed")
    });

    let mut workers = Vec::with_capacity(config.concurrency);
    for index in 0..config.concurrency {
        workers.push(tokio::spawn(redis_queue::run_worker(
            index,
            config.clone(),
            analyzer.clone(),
            metrics.clone(),
        )));
    }
    info!(
        concurrency = config.concurrency,
        "NetPhim Rust HLS analyzer started"
    );

    tokio::signal::ctrl_c()
        .await
        .context("failed to listen for shutdown signal")?;
    info!("shutdown signal received");
    metrics
        .ready
        .store(false, std::sync::atomic::Ordering::Relaxed);
    for worker in workers {
        worker.abort();
        if let Err(error) = worker.await {
            if !error.is_cancelled() {
                warn!(error = %error, "worker shutdown failed");
            }
        }
    }
    health_server.abort();
    tokio::time::sleep(Duration::from_millis(50)).await;
    Ok(())
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .json()
        .with_current_span(false)
        .init();
}

pub fn unix_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
