use std::{collections::HashMap, sync::Arc, time::Duration};

use anyhow::{Context, Result};
use redis::{
    aio::ConnectionManager,
    streams::{
        StreamAutoClaimOptions, StreamAutoClaimReply, StreamId, StreamPendingReply,
        StreamReadOptions, StreamReadReply,
    },
    AsyncCommands,
};
use tokio::sync::broadcast;
use tracing::{info, warn};

use crate::{
    analyzer::Analyzer,
    config::Config,
    metrics::Metrics,
    models::{AnalysisJob, AnalysisResult},
};

pub async fn create_connection(config: &Config) -> Result<ConnectionManager> {
    let client = redis::Client::open(config.redis_url.as_str()).context("invalid REDIS_URL")?;
    ConnectionManager::new(client)
        .await
        .context("Redis connection failed")
}

pub async fn ensure_group(connection: &mut ConnectionManager, config: &Config) -> Result<()> {
    let result: redis::RedisResult<String> = redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(&config.job_stream)
        .arg(&config.consumer_group)
        .arg("0")
        .arg("MKSTREAM")
        .query_async(connection)
        .await;
    match result {
        Ok(_) => Ok(()),
        Err(error) if error.to_string().contains("BUSYGROUP") => Ok(()),
        Err(error) => Err(error).context("unable to create Redis consumer group"),
    }
}

pub async fn run_worker(
    worker_index: usize,
    config: Arc<Config>,
    analyzer: Analyzer,
    metrics: Arc<Metrics>,
    mut shutdown: broadcast::Receiver<()>,
) {
    let consumer = format!("{}-{worker_index}", config.consumer_name);
    loop {
        let mut connection = match create_connection(&config).await {
            Ok(connection) => connection,
            Err(error) => {
                metrics
                    .redis_errors
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                warn!(worker_index, error = %error, "Redis unavailable; retrying");
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs(2)) => continue,
                    _ = shutdown.recv() => { info!(worker_index, "shutdown signal received"); return; }
                }
            }
        };
        if let Err(error) = ensure_group(&mut connection, &config).await {
            warn!(worker_index, error = %error, "consumer group unavailable");
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(2)) => continue,
                _ = shutdown.recv() => { info!(worker_index, "shutdown signal received"); return; }
            }
        }

        metrics
            .ready
            .store(true, std::sync::atomic::Ordering::Relaxed);
        info!(worker_index, consumer, "HLS analyzer worker ready");

        if let Err(error) =
            reclaim_stale(&mut connection, &config, &consumer, &analyzer, &metrics).await
        {
            warn!(worker_index, error = %error, "unable to reclaim stale jobs");
        }

        tokio::select! {
            result = consume(&mut connection, &config, &consumer, &analyzer, &metrics) => {
                if let Err(error) = result {
                    metrics
                        .ready
                        .store(false, std::sync::atomic::Ordering::Relaxed);
                    metrics
                        .redis_errors
                        .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                    warn!(worker_index, error = %error, "consumer loop interrupted; reconnecting");
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
            }
            _ = shutdown.recv() => {
                info!(worker_index, "shutdown signal received; worker stopping after current job");
                return;
            }
        }
    }
}

async fn reclaim_stale(
    connection: &mut ConnectionManager,
    config: &Config,
    consumer: &str,
    analyzer: &Analyzer,
    metrics: &Metrics,
) -> Result<()> {
    let mut cursor = "0-0".to_owned();
    // Cap each startup sweep so a large stale backlog cannot starve new jobs.
    for _ in 0..10 {
        let reply = auto_claim_batch(connection, config, consumer, &cursor).await?;
        let claimed = reply.claimed.len();
        for entry in reply.claimed {
            process_stream_id(connection, config, analyzer, metrics, entry).await?;
        }
        if claimed > 0 {
            metrics
                .jobs_reclaimed
                .fetch_add(claimed as u64, std::sync::atomic::Ordering::Relaxed);
        }
        if reply.next_stream_id == "0-0" || claimed == 0 {
            break;
        }
        cursor = reply.next_stream_id;
    }
    update_pending_metric(connection, config, metrics).await?;
    Ok(())
}

async fn update_pending_metric(
    connection: &mut ConnectionManager,
    config: &Config,
    metrics: &Metrics,
) -> Result<()> {
    let pending: StreamPendingReply = connection
        .xpending(&config.job_stream, &config.consumer_group)
        .await
        .context("XPENDING failed")?;
    metrics
        .pending_jobs
        .store(pending.count() as u64, std::sync::atomic::Ordering::Relaxed);
    Ok(())
}

async fn auto_claim_batch(
    connection: &mut ConnectionManager,
    config: &Config,
    consumer: &str,
    cursor: &str,
) -> Result<StreamAutoClaimReply> {
    connection
        .xautoclaim_options(
            &config.job_stream,
            &config.consumer_group,
            consumer,
            config.reclaim_idle.as_millis() as u64,
            cursor,
            StreamAutoClaimOptions::default(),
        )
        .await
        .context("XAUTOCLAIM failed")
}

async fn process_stream_id(
    connection: &mut ConnectionManager,
    config: &Config,
    analyzer: &Analyzer,
    metrics: &Metrics,
    entry: StreamId,
) -> Result<()> {
    process_entry(connection, config, analyzer, metrics, &entry.id, &entry.map).await
}

async fn consume(
    connection: &mut ConnectionManager,
    config: &Config,
    consumer: &str,
    analyzer: &Analyzer,
    metrics: &Metrics,
) -> Result<()> {
    // Read entries previously delivered to this stable consumer first. This
    // prevents a process restart from silently abandoning its in-flight job.
    drain(connection, config, consumer, analyzer, metrics, "0").await?;
    let mut last_reclaim = std::time::Instant::now();
    let reclaim_interval = config.reclaim_idle.max(Duration::from_secs(30));
    loop {
        drain(connection, config, consumer, analyzer, metrics, ">").await?;
        if last_reclaim.elapsed() >= reclaim_interval {
            reclaim_stale(connection, config, consumer, analyzer, metrics).await?;
            last_reclaim = std::time::Instant::now();
        }
    }
}

async fn drain(
    connection: &mut ConnectionManager,
    config: &Config,
    consumer: &str,
    analyzer: &Analyzer,
    metrics: &Metrics,
    offset: &str,
) -> Result<()> {
    let options = StreamReadOptions::default()
        .group(&config.consumer_group, consumer)
        .count(1)
        .block(if offset == ">" { 5_000 } else { 50 });
    let reply: StreamReadReply = connection
        .xread_options(&[&config.job_stream], &[offset], &options)
        .await
        .context("XREADGROUP failed")?;

    for key in reply.keys {
        for entry in key.ids {
            process_stream_id(connection, config, analyzer, metrics, entry).await?;
        }
    }
    Ok(())
}

async fn process_entry(
    connection: &mut ConnectionManager,
    config: &Config,
    analyzer: &Analyzer,
    metrics: &Metrics,
    stream_id: &str,
    fields: &HashMap<String, redis::Value>,
) -> Result<()> {
    let payload = fields
        .get("payload")
        .and_then(|value| redis::from_redis_value::<String>(value).ok());
    let Some(payload) = payload else {
        dead_letter(connection, config, stream_id, "missing payload", "").await?;
        metrics
            .jobs_dead_lettered
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        ack(connection, config, stream_id).await?;
        return Ok(());
    };
    let job: AnalysisJob = match serde_json::from_str::<AnalysisJob>(&payload) {
        Ok(job) if !job.job_id.trim().is_empty() && !job.url.trim().is_empty() => job,
        Ok(_) => {
            dead_letter(
                connection,
                config,
                stream_id,
                "job_id and url are required",
                &payload,
            )
            .await?;
            metrics
                .jobs_dead_lettered
                .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            ack(connection, config, stream_id).await?;
            return Ok(());
        }
        Err(error) => {
            dead_letter(connection, config, stream_id, &error.to_string(), &payload).await?;
            metrics
                .jobs_dead_lettered
                .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            ack(connection, config, stream_id).await?;
            return Ok(());
        }
    };
    if job.schema_version != 1 {
        dead_letter(
            connection,
            config,
            stream_id,
            &format!("unsupported schemaVersion {}", job.schema_version),
            &payload,
        )
        .await?;
        metrics
            .jobs_dead_lettered
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        ack(connection, config, stream_id).await?;
        return Ok(());
    }

    metrics
        .jobs_total
        .fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    // Retry loop: attempt analysis up to config.retry_attempts times with
    // exponential backoff before writing a failed result.
    let started = std::time::Instant::now();
    let mut result = analyzer.analyze(&job).await;
    let mut attempt = 1usize;
    while !result.playable && result.retryable && attempt < config.retry_attempts {
        let backoff_ms = retry_delay_ms(config, &job.job_id, attempt);
        warn!(
            job_id = job.job_id,
            trace_id = job.trace_id,
            attempt,
            backoff_ms,
            "analysis failed; retrying"
        );
        tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
        metrics
            .jobs_retried
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        result = analyzer.analyze(&job).await;
        attempt += 1;
    }
    let duration_ms = started.elapsed().as_millis() as u64;
    metrics.record_duration(duration_ms);

    if !result.playable {
        metrics
            .jobs_failed
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    } else {
        metrics
            .manifests_playable
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }
    persist_result(connection, config, &result).await?;
    ack(connection, config, stream_id).await?;
    update_pending_metric(connection, config, metrics).await?;
    info!(
        job_id = result.job_id,
        trace_id = result.trace_id,
        playable = result.playable,
        health_score = result.health_score,
        segments = result.segment_count,
        attempts = attempt,
        duration_ms,
        "HLS analysis complete"
    );
    Ok(())
}

fn retry_delay_ms(config: &Config, job_id: &str, attempt: usize) -> u64 {
    let base = config
        .retry_backoff_ms
        .saturating_mul(1u64 << attempt.saturating_sub(1).min(4));
    // Stable 75-125% jitter avoids synchronized retry storms without another
    // random-number dependency.
    let hash = job_id.bytes().fold(attempt as u64, |value, byte| {
        value.wrapping_mul(31).wrapping_add(byte as u64)
    });
    base.saturating_mul(75 + hash % 51) / 100
}

async fn persist_result(
    connection: &mut ConnectionManager,
    config: &Config,
    result: &AnalysisResult,
) -> Result<()> {
    let payload = serde_json::to_string(result)?;
    let cache_key = format!("{}{}", config.result_prefix, result.job_id);
    let _: () = connection
        .set_ex(&cache_key, &payload, config.result_ttl_seconds)
        .await
        .context("result cache write failed")?;
    let _: String = redis::cmd("XADD")
        .arg(&config.result_stream)
        .arg("MAXLEN")
        .arg("~")
        .arg(10_000)
        .arg("*")
        .arg("payload")
        .arg(payload)
        .query_async(connection)
        .await
        .context("result stream write failed")?;
    Ok(())
}

async fn dead_letter(
    connection: &mut ConnectionManager,
    config: &Config,
    stream_id: &str,
    reason: &str,
    payload: &str,
) -> Result<()> {
    let _: String = redis::cmd("XADD")
        .arg(&config.dead_letter_stream)
        .arg("MAXLEN")
        .arg("~")
        .arg(1_000)
        .arg("*")
        .arg("sourceId")
        .arg(stream_id)
        .arg("reason")
        .arg(reason)
        .arg("payload")
        .arg(payload)
        .query_async(connection)
        .await?;
    Ok(())
}

async fn ack(connection: &mut ConnectionManager, config: &Config, stream_id: &str) -> Result<()> {
    let _: usize = connection
        .xack(&config.job_stream, &config.consumer_group, &[stream_id])
        .await?;
    // Processed jobs can contain short-lived signed upstream URLs. Remove the
    // entry after acknowledgement instead of retaining those credentials in
    // the stream until MAXLEN eviction.
    let _: usize = connection.xdel(&config.job_stream, &[stream_id]).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retry_delay_has_bounded_jitter() {
        let mut config = test_config("redis://127.0.0.1:6379", "unit");
        config.retry_backoff_ms = 1_000;
        let delay = retry_delay_ms(&config, "job-1", 1);
        assert!((750..=1_250).contains(&delay));
        let second = retry_delay_ms(&config, "job-1", 2);
        assert!((1_500..=2_500).contains(&second));
    }

    #[test]
    fn shared_contract_version_is_explicit() {
        let current: AnalysisJob = serde_json::from_str(
            r#"{"schemaVersion":1,"jobId":"job-1","url":"https://media.example.test/a.m3u8","requestedAt":1}"#,
        )
        .expect("v1 job must decode");
        assert_eq!(current.schema_version, 1);

        let future: AnalysisJob = serde_json::from_str(
            r#"{"schemaVersion":2,"jobId":"job-2","url":"https://media.example.test/a.m3u8","requestedAt":1}"#,
        )
        .expect("future job remains parseable for dead-letter diagnostics");
        assert_ne!(future.schema_version, 1);
    }

    #[tokio::test]
    async fn reclaims_job_from_crashed_consumer() {
        let Ok(redis_url) = std::env::var("TEST_REDIS_URL") else {
            return;
        };
        let suffix = format!("{}-{}", std::process::id(), crate::unix_timestamp());
        let config = test_config(&redis_url, &suffix);
        let mut connection = create_connection(&config)
            .await
            .expect("test Redis must be reachable");
        ensure_group(&mut connection, &config)
            .await
            .expect("consumer group must be created");

        let payload = r#"{"schemaVersion":1,"jobId":"reclaim-test","url":"https://media.example.test/a.m3u8","requestedAt":1}"#;
        let _: String = redis::cmd("XADD")
            .arg(&config.job_stream)
            .arg("*")
            .arg("payload")
            .arg(payload)
            .query_async(&mut connection)
            .await
            .expect("job must be appended");
        let options = StreamReadOptions::default()
            .group(&config.consumer_group, "crashed-consumer")
            .count(1);
        let delivered: StreamReadReply = connection
            .xread_options(&[&config.job_stream], &[">"], &options)
            .await
            .expect("job must be delivered to crashed consumer");
        assert_eq!(delivered.keys[0].ids.len(), 1);

        let claimed = auto_claim_batch(&mut connection, &config, "replacement-consumer", "0-0")
            .await
            .expect("stale job must be reclaimed");
        assert_eq!(claimed.claimed.len(), 1);

        let _: usize = connection
            .del(&config.job_stream)
            .await
            .expect("test stream cleanup must succeed");
    }

    fn test_config(redis_url: &str, suffix: &str) -> Config {
        Config {
            redis_url: redis_url.to_owned(),
            job_stream: format!("netphim:test:jobs:{suffix}"),
            result_stream: format!("netphim:test:results:{suffix}"),
            dead_letter_stream: format!("netphim:test:dead:{suffix}"),
            consumer_group: format!("test-group-{suffix}"),
            consumer_name: format!("test-consumer-{suffix}"),
            result_prefix: format!("netphim:test:result:{suffix}:"),
            result_ttl_seconds: 60,
            concurrency: 1,
            request_timeout: Duration::from_secs(1),
            max_manifest_bytes: 64 * 1024,
            segment_sample_size: 0,
            health_port: 0,
            allowed_hosts: vec!["media.example.test".to_owned()],
            require_https: true,
            shutdown_timeout: Duration::from_secs(1),
            retry_attempts: 2,
            retry_backoff_ms: 1_000,
            reclaim_idle: Duration::from_millis(0),
        }
    }
}
