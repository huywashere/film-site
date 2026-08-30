use std::{collections::HashMap, sync::Arc, time::Duration};

use anyhow::{Context, Result};
use redis::{
    aio::ConnectionManager,
    streams::{StreamReadOptions, StreamReadReply},
    AsyncCommands,
};
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
                tokio::time::sleep(Duration::from_secs(2)).await;
                continue;
            }
        };
        if let Err(error) = ensure_group(&mut connection, &config).await {
            warn!(worker_index, error = %error, "consumer group unavailable");
            tokio::time::sleep(Duration::from_secs(2)).await;
            continue;
        }

        metrics
            .ready
            .store(true, std::sync::atomic::Ordering::Relaxed);
        info!(worker_index, consumer, "HLS analyzer worker ready");

        if let Err(error) = consume(&mut connection, &config, &consumer, &analyzer, &metrics).await
        {
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
    loop {
        drain(connection, config, consumer, analyzer, metrics, ">").await?;
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
            process_entry(connection, config, analyzer, metrics, &entry.id, &entry.map).await?;
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
            ack(connection, config, stream_id).await?;
            return Ok(());
        }
        Err(error) => {
            dead_letter(connection, config, stream_id, &error.to_string(), &payload).await?;
            ack(connection, config, stream_id).await?;
            return Ok(());
        }
    };

    metrics
        .jobs_total
        .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    let result = analyzer.analyze(&job).await;
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
    info!(
        job_id = result.job_id,
        playable = result.playable,
        health_score = result.health_score,
        segments = result.segment_count,
        "HLS analysis complete"
    );
    Ok(())
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
