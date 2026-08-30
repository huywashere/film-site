use std::{collections::HashSet, sync::Arc, time::Instant};

use anyhow::{bail, Context, Result};
use futures_util::{stream::FuturesUnordered, StreamExt};
use reqwest::{header, redirect::Policy, Client, Response};
use url::Url;

use crate::{
    config::Config,
    models::{AnalysisJob, AnalysisResult, Marker, Variant},
    unix_timestamp,
};

#[derive(Clone)]
pub struct Analyzer {
    config: Arc<Config>,
    client: Client,
}

#[derive(Default)]
struct ParsedPlaylist {
    duration_seconds: f64,
    segment_urls: Vec<String>,
    variants: Vec<Variant>,
    ad_markers: Vec<Marker>,
    intro_markers: Vec<Marker>,
    discontinuities: usize,
}

impl Analyzer {
    pub fn new(config: Arc<Config>) -> Result<Self> {
        let redirect_config = config.clone();
        let client = Client::builder()
            .timeout(config.request_timeout)
            .connect_timeout(
                config
                    .request_timeout
                    .min(std::time::Duration::from_secs(3)),
            )
            .redirect(Policy::custom(move |attempt| {
                if attempt.previous().len() >= 3 {
                    return attempt.error("too many redirects");
                }
                if url_allowed(attempt.url(), &redirect_config) {
                    attempt.follow()
                } else {
                    attempt.error("redirect target is not allowed")
                }
            }))
            .user_agent("NetPhim-HLS-Analyzer/1.0")
            .build()?;
        Ok(Self { config, client })
    }

    pub async fn analyze(&self, job: &AnalysisJob) -> AnalysisResult {
        let mut errors = Vec::new();
        let started = Instant::now();
        let original_url = match self.validate_url(&job.url) {
            Ok(url) => url,
            Err(error) => {
                return failed_result(job, error.to_string(), started.elapsed().as_millis() as u64)
            }
        };

        let (mut final_url, mut body) = match self.fetch_manifest(original_url).await {
            Ok(value) => value,
            Err(error) => {
                return failed_result(job, error.to_string(), started.elapsed().as_millis() as u64)
            }
        };
        let manifest_latency_ms = started.elapsed().as_millis() as u64;
        let mut parsed = match parse_playlist(&body, &final_url) {
            Ok(value) => value,
            Err(error) => return failed_result(job, error.to_string(), manifest_latency_ms),
        };

        // A master playlist has no media duration. Analyze its highest-bandwidth
        // variant once, while retaining every advertised quality in the result.
        if !parsed.variants.is_empty() && parsed.segment_urls.is_empty() {
            if let Some(selected) = parsed
                .variants
                .iter()
                .max_by_key(|variant| variant.bandwidth.unwrap_or_default())
                .cloned()
            {
                match self.validate_url(&selected.url) {
                    Ok(variant_url) => match self.fetch_manifest(variant_url).await {
                        Ok((variant_final_url, variant_body)) => {
                            match parse_playlist(&variant_body, &variant_final_url) {
                                Ok(mut media) => {
                                    media.variants = parsed.variants;
                                    parsed = media;
                                    final_url = variant_final_url;
                                    body = variant_body;
                                }
                                Err(error) => errors.push(error.to_string()),
                            }
                        }
                        Err(error) => errors.push(error.to_string()),
                    },
                    Err(error) => errors.push(error.to_string()),
                }
            }
        }

        let sample_urls = select_samples(&parsed.segment_urls, self.config.segment_sample_size);
        let sampled_segments = sample_urls.len();
        let broken_segments = self.check_segments(sample_urls).await;
        if body.trim().is_empty() {
            errors.push("manifest is empty".to_owned());
        }

        let playable = !parsed.segment_urls.is_empty()
            && (sampled_segments == 0 || broken_segments.len() < sampled_segments);
        let health_score = score(
            playable,
            manifest_latency_ms,
            parsed.segment_urls.len(),
            sampled_segments,
            broken_segments.len(),
            errors.len(),
        );

        AnalysisResult {
            schema_version: 1,
            job_id: job.job_id.clone(),
            url: redact_url(&job.url),
            final_url: redact_url(final_url.as_str()),
            provider: job.provider.clone(),
            movie_slug: job.movie_slug.clone(),
            episode: job.episode.clone(),
            playable,
            playlist_kind: if parsed.variants.is_empty() {
                "media".to_owned()
            } else {
                "master".to_owned()
            },
            duration_seconds: round_millis(parsed.duration_seconds),
            segment_count: parsed.segment_urls.len(),
            sampled_segments,
            broken_segments: broken_segments
                .into_iter()
                .map(|value| redact_url(&value))
                .collect(),
            variants: parsed
                .variants
                .into_iter()
                .map(|mut variant| {
                    variant.url = redact_url(&variant.url);
                    variant
                })
                .collect(),
            ad_markers: parsed.ad_markers,
            intro_markers: parsed.intro_markers,
            discontinuities: parsed.discontinuities,
            manifest_latency_ms,
            health_score,
            analyzed_at: unix_timestamp(),
            errors,
        }
    }

    fn validate_url(&self, raw: &str) -> Result<Url> {
        let url = Url::parse(raw).context("invalid media URL")?;
        if !url_allowed(&url, &self.config) {
            bail!("media URL is not allowed");
        }
        Ok(url)
    }

    async fn fetch_manifest(&self, url: Url) -> Result<(Url, String)> {
        let response = self
            .client
            .get(url)
            .send()
            .await
            .context("manifest request failed")?;
        let final_url = response.url().clone();
        if !response.status().is_success() {
            bail!("manifest returned HTTP {}", response.status());
        }
        if response.content_length().unwrap_or_default() > self.config.max_manifest_bytes as u64 {
            bail!("manifest exceeds size limit");
        }
        let bytes = response.bytes().await.context("manifest body failed")?;
        if bytes.len() > self.config.max_manifest_bytes {
            bail!("manifest exceeds size limit");
        }
        let body = String::from_utf8(bytes.to_vec()).context("manifest is not UTF-8")?;
        Ok((final_url, body))
    }

    async fn check_segments(&self, urls: Vec<String>) -> Vec<String> {
        let mut futures = FuturesUnordered::new();
        for raw in urls {
            let client = self.client.clone();
            let config = self.config.clone();
            futures.push(async move {
                let url = Url::parse(&raw).map_err(|_| raw.clone())?;
                if !url_allowed(&url, &config) {
                    return Err(raw);
                }
                let response: Response = client
                    .get(url)
                    .header(header::RANGE, "bytes=0-0")
                    .send()
                    .await
                    .map_err(|_| raw.clone())?;
                if response.status().is_success()
                    || response.status() == reqwest::StatusCode::PARTIAL_CONTENT
                {
                    Ok(())
                } else {
                    Err(raw)
                }
            });
        }
        let mut broken = Vec::new();
        while let Some(result) = futures.next().await {
            if let Err(url) = result {
                broken.push(url);
            }
        }
        broken
    }
}

fn url_allowed(url: &Url, config: &Config) -> bool {
    if config.require_https && url.scheme() != "https" {
        return false;
    }
    if url.scheme() != "https" && url.scheme() != "http" {
        return false;
    }
    let Some(host) = url.host_str().map(str::to_ascii_lowercase) else {
        return false;
    };
    if host == "localhost" || host.parse::<std::net::IpAddr>().is_ok() {
        return false;
    }
    config
        .allowed_hosts
        .iter()
        .any(|pattern| wildcard_match(pattern, &host))
}

fn wildcard_match(pattern: &str, value: &str) -> bool {
    let pattern = pattern.as_bytes();
    let value = value.as_bytes();
    let (mut pattern_index, mut value_index) = (0, 0);
    let mut wildcard = None;
    let mut wildcard_value_index = 0;

    while value_index < value.len() {
        if pattern_index < pattern.len() && pattern[pattern_index] == value[value_index] {
            pattern_index += 1;
            value_index += 1;
        } else if pattern_index < pattern.len() && pattern[pattern_index] == b'*' {
            wildcard = Some(pattern_index);
            pattern_index += 1;
            wildcard_value_index = value_index;
        } else if let Some(position) = wildcard {
            pattern_index = position + 1;
            wildcard_value_index += 1;
            value_index = wildcard_value_index;
        } else {
            return false;
        }
    }
    while pattern_index < pattern.len() && pattern[pattern_index] == b'*' {
        pattern_index += 1;
    }
    pattern_index == pattern.len()
}

fn parse_playlist(source: &str, base: &Url) -> Result<ParsedPlaylist> {
    if !source.trim_start().starts_with("#EXTM3U") {
        bail!("response is not an HLS playlist");
    }

    let lines: Vec<&str> = source
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect();
    let mut parsed = ParsedPlaylist::default();
    let mut pending_segment_duration: Option<f64> = None;
    let mut pending_variant: Option<(Option<u64>, Option<String>)> = None;
    let mut current_time = 0.0_f64;
    let mut active_ad_start: Option<f64> = None;
    let mut seen_markers = HashSet::new();

    for line in lines {
        if let Some(raw) = line.strip_prefix("#EXTINF:") {
            pending_segment_duration = raw
                .split(',')
                .next()
                .and_then(|value| value.parse::<f64>().ok());
            continue;
        }
        if let Some(attributes) = line.strip_prefix("#EXT-X-STREAM-INF:") {
            pending_variant = Some((
                attribute(attributes, "BANDWIDTH").and_then(|value| value.parse().ok()),
                attribute(attributes, "RESOLUTION"),
            ));
            continue;
        }
        if line.starts_with("#EXT-X-DISCONTINUITY") {
            parsed.discontinuities += 1;
            continue;
        }
        if line.starts_with("#EXT-X-CUE-OUT") {
            active_ad_start.get_or_insert(current_time);
            continue;
        }
        if line.starts_with("#EXT-X-CUE-IN") {
            if let Some(start) = active_ad_start.take() {
                push_marker(
                    &mut parsed.ad_markers,
                    &mut seen_markers,
                    "ad",
                    start,
                    Some((current_time - start).max(0.0)),
                    "cue",
                );
            }
            continue;
        }
        if let Some(attributes) = line.strip_prefix("#EXT-X-DATERANGE:") {
            let class = attribute(attributes, "CLASS")
                .unwrap_or_default()
                .to_ascii_lowercase();
            let duration = attribute(attributes, "DURATION").and_then(|value| value.parse().ok());
            if class.contains("ad") || class.contains("scte") {
                push_marker(
                    &mut parsed.ad_markers,
                    &mut seen_markers,
                    "ad",
                    current_time,
                    duration,
                    "daterange",
                );
            } else if class.contains("intro") || class.contains("opening") {
                push_marker(
                    &mut parsed.intro_markers,
                    &mut seen_markers,
                    "intro",
                    current_time,
                    duration,
                    "daterange",
                );
            }
            continue;
        }
        if line.starts_with('#') {
            continue;
        }

        let resolved = base
            .join(line)
            .context("playlist contains an invalid relative URL")?;
        if let Some((bandwidth, resolution)) = pending_variant.take() {
            parsed.variants.push(Variant {
                url: resolved.to_string(),
                bandwidth,
                resolution,
            });
            continue;
        }
        if let Some(duration) = pending_segment_duration.take() {
            parsed.segment_urls.push(resolved.to_string());
            current_time += duration.max(0.0);
        }
    }

    if let Some(start) = active_ad_start {
        push_marker(
            &mut parsed.ad_markers,
            &mut seen_markers,
            "ad",
            start,
            Some((current_time - start).max(0.0)),
            "cue",
        );
    }
    parsed.duration_seconds = current_time;
    Ok(parsed)
}

fn attribute(input: &str, name: &str) -> Option<String> {
    input.split(',').find_map(|part| {
        let (key, value) = part.split_once('=')?;
        if key.trim().eq_ignore_ascii_case(name) {
            Some(value.trim().trim_matches('"').to_owned())
        } else {
            None
        }
    })
}

fn push_marker(
    markers: &mut Vec<Marker>,
    seen: &mut HashSet<String>,
    kind: &str,
    start: f64,
    duration: Option<f64>,
    source: &str,
) {
    let key = format!("{kind}:{start:.3}:{source}");
    if seen.insert(key) {
        markers.push(Marker {
            kind: kind.to_owned(),
            start_seconds: round_millis(start),
            duration_seconds: duration.map(round_millis),
            source: source.to_owned(),
        });
    }
}

fn select_samples(urls: &[String], count: usize) -> Vec<String> {
    if count == 0 || urls.is_empty() {
        return Vec::new();
    }
    if urls.len() <= count {
        return urls.to_vec();
    }
    (0..count)
        .map(|index| {
            let position = index * (urls.len() - 1) / (count - 1).max(1);
            urls[position].clone()
        })
        .collect::<HashSet<_>>()
        .into_iter()
        .collect()
}

fn score(
    playable: bool,
    latency_ms: u64,
    segment_count: usize,
    sampled: usize,
    broken: usize,
    error_count: usize,
) -> u8 {
    if !playable {
        return 0;
    }
    let mut value = 100_i32;
    value -= ((latency_ms.saturating_sub(500) / 250) as i32).min(20);
    if segment_count == 0 {
        value -= 50;
    }
    if sampled > 0 {
        value -= ((broken * 50) / sampled) as i32;
    }
    value -= (error_count as i32 * 10).min(30);
    value.clamp(0, 100) as u8
}

fn failed_result(job: &AnalysisJob, error: String, latency_ms: u64) -> AnalysisResult {
    AnalysisResult {
        schema_version: 1,
        job_id: job.job_id.clone(),
        url: redact_url(&job.url),
        final_url: String::new(),
        provider: job.provider.clone(),
        movie_slug: job.movie_slug.clone(),
        episode: job.episode.clone(),
        playable: false,
        playlist_kind: "unknown".to_owned(),
        duration_seconds: 0.0,
        segment_count: 0,
        sampled_segments: 0,
        broken_segments: Vec::new(),
        variants: Vec::new(),
        ad_markers: Vec::new(),
        intro_markers: Vec::new(),
        discontinuities: 0,
        manifest_latency_ms: latency_ms,
        health_score: 0,
        analyzed_at: unix_timestamp(),
        errors: vec![error],
    }
}

fn round_millis(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}

fn redact_url(raw: &str) -> String {
    match Url::parse(raw) {
        Ok(mut url) => {
            url.set_query(None);
            url.set_fragment(None);
            url.to_string()
        }
        Err(_) => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_duration_and_ad_markers_without_removing_segments() {
        let source = "#EXTM3U\n#EXTINF:5,\na.ts\n#EXT-X-CUE-OUT:5\n#EXTINF:5,\nad.ts\n#EXT-X-CUE-IN\n#EXTINF:4.5,\nb.ts\n";
        let parsed = parse_playlist(
            source,
            &Url::parse("https://video.example.com/main.m3u8").unwrap(),
        )
        .unwrap();
        assert_eq!(parsed.segment_urls.len(), 3);
        assert_eq!(parsed.duration_seconds, 14.5);
        assert_eq!(parsed.ad_markers.len(), 1);
        assert_eq!(parsed.ad_markers[0].start_seconds, 5.0);
        assert_eq!(parsed.ad_markers[0].duration_seconds, Some(5.0));
    }

    #[test]
    fn parses_master_playlist_variants() {
        let source = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=1280x720\n720/index.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1800000,RESOLUTION=1920x1080\n1080/index.m3u8\n";
        let parsed = parse_playlist(
            source,
            &Url::parse("https://video.example.com/master.m3u8").unwrap(),
        )
        .unwrap();
        assert_eq!(parsed.variants.len(), 2);
        assert_eq!(parsed.variants[1].bandwidth, Some(1_800_000));
        assert!(parsed.variants[1].url.ends_with("/1080/index.m3u8"));
    }

    #[test]
    fn rejects_non_hls_payloads() {
        let error = parse_playlist(
            "<html>nope</html>",
            &Url::parse("https://video.example.com/main.m3u8").unwrap(),
        );
        assert!(error.is_err());
    }

    #[test]
    fn matches_provider_host_patterns_without_matching_untrusted_suffixes() {
        assert!(wildcard_match(
            "*.kkphimplayer*.com",
            "cdn.kkphimplayer7.com"
        ));
        assert!(wildcard_match("vicdn.cc", "vicdn.cc"));
        assert!(!wildcard_match("*.vicdn.cc", "evil-vicdn.cc"));
        assert!(!wildcard_match("*.vicdn.cc", "vicdn.cc.evil.example"));
    }
}
