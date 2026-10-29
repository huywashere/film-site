package subtitles

import (
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

var (
	voiceTagRegex = regexp.MustCompile(`(?i)</?v[^>]*>`)
	colorTagRegex = regexp.MustCompile(`(?i)</?c[^>]*>`)
	numericRegex  = regexp.MustCompile(`^\d+$`)
)

// DecryptSubtitle decrypts RC4-encrypted subtitle payload if HUBPHIM_ENC: prefix is present.
func DecryptSubtitle(content, secretKey string) string {
	if secretKey == "" {
		secretKey = HubphimDefaultKey
	}
	trimmed := strings.TrimSpace(content)
	if !strings.HasPrefix(trimmed, HubphimEncPrefix) {
		return content
	}

	hexCipher := trimmed[len(HubphimEncPrefix):]
	var cipherText []rune
	for i := 0; i+4 <= len(hexCipher); i += 4 {
		code, err := strconv.ParseInt(hexCipher[i:i+4], 16, 32)
		if err == nil {
			cipherText = append(cipherText, rune(code))
		}
	}

	// RC4 Key Scheduling Algorithm (KSA)
	sBox := make([]int, 256)
	for i := 0; i < 256; i++ {
		sBox[i] = i
	}

	keyLen := len(secretKey)
	if keyLen == 0 {
		return content
	}

	j := 0
	for i := 0; i < 256; i++ {
		j = (j + sBox[i] + int(secretKey[i%keyLen])) % 256
		sBox[i], sBox[j] = sBox[j], sBox[i]
	}

	// RC4 Pseudo-Random Generation Algorithm (PRGA)
	i := 0
	j = 0
	var plainText strings.Builder
	plainText.Grow(len(cipherText))

	for _, ch := range cipherText {
		i = (i + 1) % 256
		j = (j + sBox[i]) % 256
		sBox[i], sBox[j] = sBox[j], sBox[i]
		randVal := sBox[(sBox[i]+sBox[j])%256]
		plainText.WriteRune(ch ^ rune(randVal))
	}

	return plainText.String()
}

// ParseTimestamp parses timestamp string (HH:MM:SS.mmm or MM:SS.mmm) into seconds.
func ParseTimestamp(timeStr string) float64 {
	timeStr = strings.TrimSpace(timeStr)
	if timeStr == "" {
		return 0
	}
	normalized := strings.ReplaceAll(timeStr, ",", ".")
	parts := strings.Split(normalized, ":")

	var hours, minutes, seconds float64
	switch len(parts) {
	case 3:
		hours, _ = strconv.ParseFloat(parts[0], 64)
		minutes, _ = strconv.ParseFloat(parts[1], 64)
		seconds, _ = strconv.ParseFloat(parts[2], 64)
	case 2:
		minutes, _ = strconv.ParseFloat(parts[0], 64)
		seconds, _ = strconv.ParseFloat(parts[1], 64)
	case 1:
		seconds, _ = strconv.ParseFloat(parts[0], 64)
	}

	total := hours*3600 + minutes*60 + seconds
	if total < 0 || math.IsNaN(total) || math.IsInf(total, 0) {
		return 0
	}
	return total
}

// FormatTimestamp formats seconds into WebVTT timestamp format (HH:MM:SS.mmm).
func FormatTimestamp(seconds float64) string {
	if seconds < 0 || math.IsNaN(seconds) || math.IsInf(seconds, 0) {
		seconds = 0
	}
	totalSec := math.Floor(seconds)
	h := int(totalSec) / 3600
	m := (int(totalSec) % 3600) / 60
	s := int(totalSec) % 60
	ms := int(math.Round((seconds - totalSec) * 1000))
	if ms > 999 {
		ms = 999
	}
	return fmt.Sprintf("%02d:%02d:%02d.%03d", h, m, s, ms)
}

// CleanCueText cleans unwanted HTML voice/color tags while preserving valid dialogue formatting.
func CleanCueText(rawText string) string {
	if rawText == "" {
		return ""
	}
	clean := voiceTagRegex.ReplaceAllString(rawText, "")
	clean = colorTagRegex.ReplaceAllString(clean, "")
	return strings.TrimSpace(clean)
}

// ParseSubtitleCues parses WebVTT or SRT content into an array of SubtitleCue objects.
func ParseSubtitleCues(content string) []SubtitleCue {
	if content == "" {
		return nil
	}
	lines := strings.Split(strings.ReplaceAll(content, "\r\n", "\n"), "\n")
	var cues []SubtitleCue

	hasStart := false
	var curStart, curEnd float64
	var curText strings.Builder

	flush := func() {
		if hasStart && curEnd > curStart {
			text := CleanCueText(curText.String())
			if text != "" {
				cues = append(cues, SubtitleCue{
					Start: curStart,
					End:   curEnd,
					Text:  text,
				})
			}
		}
		hasStart = false
		curStart = 0
		curEnd = 0
		curText.Reset()
	}

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		if strings.Contains(trimmed, "-->") {
			flush()
			parts := strings.Split(trimmed, "-->")
			if len(parts) >= 2 {
				startStr := strings.TrimSpace(parts[0])
				endField := strings.Fields(strings.TrimSpace(parts[1]))
				var endStr string
				if len(endField) > 0 {
					endStr = endField[0]
				}
				curStart = ParseTimestamp(startStr)
				curEnd = ParseTimestamp(endStr)
				hasStart = true
			}
		} else if trimmed != "" && hasStart {
			if numericRegex.MatchString(trimmed) && curText.Len() == 0 {
				continue // Skip purely numeric cue index
			}
			if curText.Len() > 0 {
				curText.WriteString("\n")
			}
			curText.WriteString(trimmed)
		} else if trimmed == "" && hasStart {
			flush()
		}
	}
	flush()

	return cues
}

// MergeDualSubtitleCues merges two subtitle tracks (Primary + Secondary) into a synchronized dual track.
func MergeDualSubtitleCues(primaryCues, secondaryCues []SubtitleCue) []SubtitleCue {
	if len(primaryCues) == 0 && len(secondaryCues) == 0 {
		return nil
	}
	if len(secondaryCues) == 0 {
		return primaryCues
	}
	if len(primaryCues) == 0 {
		return secondaryCues
	}

	timeMap := make(map[float64]struct{})
	for _, cue := range primaryCues {
		timeMap[cue.Start] = struct{}{}
		timeMap[cue.End] = struct{}{}
	}
	for _, cue := range secondaryCues {
		timeMap[cue.Start] = struct{}{}
		timeMap[cue.End] = struct{}{}
	}

	sortedPoints := make([]float64, 0, len(timeMap))
	for t := range timeMap {
		sortedPoints = append(sortedPoints, t)
	}
	sort.Float64s(sortedPoints)

	var rawMerged []SubtitleCue
	for i := 0; i < len(sortedPoints)-1; i++ {
		tStart := sortedPoints[i]
		tEnd := sortedPoints[i+1]

		if tEnd-tStart < 0.05 {
			continue // Ignore slices < 50ms
		}

		var priText, secText string
		for _, c := range primaryCues {
			if c.Start <= tStart && c.End >= tEnd {
				priText = c.Text
				break
			}
		}
		for _, c := range secondaryCues {
			if c.Start <= tStart && c.End >= tEnd {
				secText = c.Text
				break
			}
		}

		if priText == "" && secText == "" {
			continue
		}

		var lines []string
		if secText != "" {
			lines = append(lines, fmt.Sprintf(`<span class="sub-sec">%s</span>`, secText))
		}
		if priText != "" {
			lines = append(lines, fmt.Sprintf(`<span class="sub-pri">%s</span>`, priText))
		}

		rawMerged = append(rawMerged, SubtitleCue{
			Start: tStart,
			End:   tEnd,
			Text:  strings.Join(lines, "\n"),
		})
	}

	// Smooth and concatenate adjacent cues with identical text
	var smoothed []SubtitleCue
	for _, cue := range rawMerged {
		if len(smoothed) > 0 {
			last := &smoothed[len(smoothed)-1]
			if last.Text == cue.Text && math.Abs(last.End-cue.Start) < 0.08 {
				last.End = cue.End
				continue
			}
		}
		smoothed = append(smoothed, cue)
	}

	return smoothed
}

// BuildWebVttString converts an array of SubtitleCue into standard WebVTT text.
func BuildWebVttString(cues []SubtitleCue) string {
	var sb strings.Builder
	sb.WriteString("WEBVTT\n\n")

	for i, cue := range cues {
		sb.WriteString(fmt.Sprintf("%d\n%s --> %s\n%s\n\n",
			i+1,
			FormatTimestamp(cue.Start),
			FormatTimestamp(cue.End),
			cue.Text,
		))
	}

	return strings.TrimRight(sb.String(), "\n") + "\n"
}

