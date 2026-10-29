package subtitles

// SubtitleCue represents a single timestamped subtitle cue with start, end, and text.
type SubtitleCue struct {
	Start float64 `json:"start"`
	End   float64 `json:"end"`
	Text  string  `json:"text"`
}

const (
	HubphimDefaultKey = "hubphim_sub_secret_key_2026"
	HubphimEncPrefix  = "HUBPHIM_ENC:"
)

