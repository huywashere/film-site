package subtitles

import (
	"strings"
	"testing"
)

func TestParseAndFormatTimestamp(t *testing.T) {
	cases := []struct {
		input    string
		expected float64
	}{
		{"00:01:23.456", 83.456},
		{"01:23.456", 83.456},
		{"00:01:23,456", 83.456},
		{"83.456", 83.456},
		{"", 0},
	}

	for _, c := range cases {
		got := ParseTimestamp(c.input)
		if got != c.expected {
			t.Errorf("ParseTimestamp(%q) = %f, want %f", c.input, got, c.expected)
		}
	}

	formatted := FormatTimestamp(83.456)
	if formatted != "00:01:23.456" {
		t.Errorf("FormatTimestamp(83.456) = %q, want 00:01:23.456", formatted)
	}
}

func TestParseSubtitleCues(t *testing.T) {
	vttContent := `WEBVTT

1
00:00:01.000 --> 00:00:04.000
<v Narrator>Hello world!</v>

2
00:00:05.500 --> 00:00:08.200 line:0% align:middle
Welcome to Cineverse.
Enjoy the show.
`
	cues := ParseSubtitleCues(vttContent)
	if len(cues) != 2 {
		t.Fatalf("expected 2 cues, got %d", len(cues))
	}
	if cues[0].Text != "Hello world!" {
		t.Errorf("expected cleaned text 'Hello world!', got %q", cues[0].Text)
	}
	if cues[0].Start != 1.0 || cues[0].End != 4.0 {
		t.Errorf("unexpected cue 1 timestamps: %f -> %f", cues[0].Start, cues[0].End)
	}
	if cues[1].Text != "Welcome to Cineverse.\nEnjoy the show." {
		t.Errorf("unexpected cue 2 text: %q", cues[1].Text)
	}
}

func TestMergeDualSubtitleCues(t *testing.T) {
	pri := []SubtitleCue{
		{Start: 1.0, End: 4.0, Text: "Xin chào thế giới"},
	}
	sec := []SubtitleCue{
		{Start: 1.0, End: 4.0, Text: "Hello world"},
	}

	merged := MergeDualSubtitleCues(pri, sec)
	if len(merged) != 1 {
		t.Fatalf("expected 1 merged cue, got %d", len(merged))
	}

	vtt := BuildWebVttString(merged)
	if !strings.Contains(vtt, `<span class="sub-sec">Hello world</span>`) {
		t.Errorf("expected secondary span in vtt, got: %s", vtt)
	}
	if !strings.Contains(vtt, `<span class="sub-pri">Xin chào thế giới</span>`) {
		t.Errorf("expected primary span in vtt, got: %s", vtt)
	}
}

func TestDecryptSubtitlePassthrough(t *testing.T) {
	plain := "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nPlain text"
	decrypted := DecryptSubtitle(plain, "any-key")
	if decrypted != plain {
		t.Errorf("expected passthrough for plain text, got %q", decrypted)
	}
}

