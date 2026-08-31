use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisJob {
    pub job_id: String,
    pub url: String,
    #[serde(default)]
    pub provider: String,
    #[serde(default)]
    pub movie_slug: String,
    #[serde(default)]
    pub episode: String,
    #[serde(default)]
    pub requested_at: u64,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Marker {
    pub kind: String,
    pub start_seconds: f64,
    pub duration_seconds: Option<f64>,
    pub source: String,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Variant {
    pub url: String,
    pub bandwidth: Option<u64>,
    pub resolution: Option<String>,
    /// CODECS attribute from #EXT-X-STREAM-INF (e.g. "avc1.640028,mp4a.40.2").
    pub codecs: Option<String>,
    /// FRAME-RATE attribute from #EXT-X-STREAM-INF.
    pub frame_rate: Option<f64>,
    /// AUDIO group ID from #EXT-X-STREAM-INF AUDIO= attribute.
    pub audio_group: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisResult {
    pub schema_version: u8,
    pub job_id: String,
    pub url: String,
    pub final_url: String,
    pub provider: String,
    pub movie_slug: String,
    pub episode: String,
    pub playable: bool,
    pub playlist_kind: String,
    pub duration_seconds: f64,
    pub segment_count: usize,
    pub sampled_segments: usize,
    pub broken_segments: Vec<String>,
    pub variants: Vec<Variant>,
    pub ad_markers: Vec<Marker>,
    pub intro_markers: Vec<Marker>,
    pub discontinuities: usize,
    pub manifest_latency_ms: u64,
    pub health_score: u8,
    pub analyzed_at: u64,
    pub errors: Vec<String>,
    /// Whether any segment in the playlist is encrypted.
    pub encrypted: bool,
    /// Encryption method if detected (e.g. "AES-128", "SAMPLE-AES").
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encryption_method: Option<String>,
}
