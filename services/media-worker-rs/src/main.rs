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
use tokio::sync::broadcast;
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

    // Broadcast channel used to signal all workers to stop gracefully.
    let (shutdown_tx, _) = broadcast::channel::<()>(1);

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
            shutdown_tx.subscribe(),
        )));
    }
    info!(
        concurrency = config.concurrency,
        "NetPhim Rust HLS analyzer started"
    );

    // Wait for SIGINT or SIGTERM.
    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};
        let mut sigterm = signal(SignalKind::terminate()).context("SIGTERM listener failed")?;
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {},
            _ = sigterm.recv() => {},
        }
    }
    #[cfg(not(unix))]
    tokio::signal::ctrl_c()
        .await
        .context("failed to listen for shutdown signal")?;

    info!(
        shutdown_timeout_secs = config.shutdown_timeout.as_secs(),
        "shutdown signal received; waiting for workers to finish"
    );
    metrics
        .ready
        .store(false, std::sync::atomic::Ordering::Relaxed);

    // Signal workers to stop after their current job.
    let _ = shutdown_tx.send(());

    // Wait for all workers to finish, up to shutdown_timeout.
    let shutdown_deadline = tokio::time::sleep(config.shutdown_timeout);
    tokio::pin!(shutdown_deadline);
    for worker in &mut workers {
        tokio::select! {
            _ = worker => {},
            _ = &mut shutdown_deadline => {
                warn!("shutdown timeout exceeded; force-aborting remaining workers");
                break;
            }
        }
    }
    for worker in workers {
        if !worker.is_finished() {
            worker.abort();
            let _ = worker.await;
        }
    }
    health_server.abort();
    tokio::time::sleep(Duration::from_millis(50)).await;
    info!("shutdown complete");
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
