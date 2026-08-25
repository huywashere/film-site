package hls

import (
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

type Stats struct {
	DetectedBreaks  int
	RemovedSegments int
	RemovedTags     int
	RemovedURIs     int
	Reasons         []string
}

type RewriteFunc func(string) string

var (
	adTokenPattern = regexp.MustCompile(`(?i)(^|[._-])(ads?|adserver|advertising|doubleclick|googlesyndication|adservice|cdn-ads|ad-cdn|ads-cdn|preroll|midroll|postroll|sponsor|casino|nha-?cai|789bet|shbet|jun88|hi88|f8bet|okvip|new88|bk8|w88|fun88|12bet|v9bet|fb88|m88|kubet|go88|sunwin|hitclub|iwin|winbet|dafabet|188bet)($|[._-])`)
	adPathPattern  = regexp.MustCompile(`(?i)(^|[/_.,?=&-])(ads?|advert(isement|ising)?|commercial|preroll|midroll|postroll|sponsor(ed)?|betting|casino|nha-?cai|quang-?cao)($|[/_.,?=&-])`)
	uriAttribute   = regexp.MustCompile(`(?i)URI="([^"]+)"|URI=([^,]+)`)
	durationAttr   = regexp.MustCompile(`(?i)(DURATION|PLANNED-DURATION)=([0-9.]+)`)
)

var segmentTags = []string{
	"#EXT-X-STREAM-INF:",
	"#EXTINF:",
	"#EXT-X-BYTERANGE:",
	"#EXT-X-PROGRAM-DATE-TIME:",
	"#EXT-X-GAP",
	"#EXT-X-BITRATE:",
}

func IsLikelyAdURL(value string) bool {
	parsed, err := url.Parse(value)
	if err != nil {
		return adPathPattern.MatchString(value)
	}
	return adTokenPattern.MatchString(strings.ToLower(parsed.Hostname())) ||
		adPathPattern.MatchString(parsed.EscapedPath()+"?"+parsed.RawQuery)
}

func Filter(content, originalURL string, rewrite RewriteFunc) (string, Stats) {
	stats := Stats{}
	output := make([]string, 0, strings.Count(content, "\n")+1)
	pending := make([]string, 0, 4)
	lines := strings.Split(strings.ReplaceAll(content, "\r\n", "\n"), "\n")
	cueBreak := false
	cueRemovedSeconds := 0.0
	timedRemaining := 0.0
	removedSinceMedia := false
	keptSegments := 0

	remember := func(reason string) {
		for _, existing := range stats.Reasons {
			if existing == reason {
				return
			}
		}
		stats.Reasons = append(stats.Reasons, reason)
	}
	flush := func() {
		output = append(output, pending...)
		pending = pending[:0]
	}

	for _, rawLine := range lines {
		line := strings.TrimSpace(rawLine)
		upper := strings.ToUpper(line)
		if line == "" {
			if len(pending) == 0 {
				output = append(output, "")
			}
			continue
		}

		switch {
		case strings.HasPrefix(upper, "#EXT-X-CUE-OUT-CONT"):
			cueBreak = true
			stats.RemovedTags++
			remember("cue-out")
			continue
		case strings.HasPrefix(upper, "#EXT-X-CUE-OUT"):
			cueBreak = true
			cueRemovedSeconds = 0
			stats.DetectedBreaks++
			stats.RemovedTags++
			remember("cue-out")
			continue
		case strings.HasPrefix(upper, "#EXT-X-CUE-IN"):
			cueBreak = false
			cueRemovedSeconds = 0
			timedRemaining = 0
			stats.RemovedTags++
			remember("cue-in")
			continue
		case strings.HasPrefix(upper, "#EXT-X-DATERANGE:") && isAdDateRange(upper):
			stats.DetectedBreaks++
			stats.RemovedTags++
			remember("daterange")
			if match := durationAttr.FindStringSubmatch(upper); len(match) > 2 {
				duration, _ := strconv.ParseFloat(match[2], 64)
				if duration > 0 && duration <= 180 && duration > timedRemaining {
					timedRemaining = duration
				}
			}
			continue
		case strings.HasPrefix(upper, "#EXT-OATCLS-SCTE35"),
			strings.HasPrefix(upper, "#EXT-X-SCTE35"),
			strings.HasPrefix(upper, "#EXT-X-SPLICEPOINT-SCTE35"):
			stats.RemovedTags++
			remember("scte35")
			continue
		case upper == "#EXT-X-DISCONTINUITY":
			if cueBreak || timedRemaining > 0 || removedSinceMedia {
				stats.RemovedTags++
				removedSinceMedia = true
				continue
			}
			flush()
			if len(output) == 0 || output[len(output)-1] != upper {
				output = append(output, upper)
			}
			continue
		}

		if hasPrefix(upper, segmentTags) {
			pending = append(pending, line)
			continue
		}

		if strings.HasPrefix(line, "#") {
			if uriAttribute.MatchString(line) {
				rewritten, blocked := rewriteAttributeURI(line, originalURL, rewrite)
				if blocked || cueBreak || timedRemaining > 0 {
					stats.RemovedTags++
					if blocked {
						stats.RemovedURIs++
						remember("uri")
					}
					continue
				}
				flush()
				output = append(output, rewritten)
				continue
			}
			flush()
			output = append(output, line)
			continue
		}

		absolute := resolveURL(originalURL, line)
		isSegment := hasPrefixInSlice(pending, "#EXTINF:") || isSegmentURL(absolute)
		duration := segmentDuration(pending)
		blockedURL := IsLikelyAdURL(absolute)
		blockedMarker := isSegment && duration > 0 && (cueBreak || timedRemaining > 0)
		// Malformed provider manifests sometimes omit CUE-IN. Never let one ad
		// marker consume the rest of a movie or jump playback to the end.
		if cueBreak && cueRemovedSeconds+duration > 180 {
			cueBreak = false
			cueRemovedSeconds = 0
			blockedMarker = timedRemaining > 0 && duration > 0
		}
		if blockedURL || blockedMarker {
			pending = pending[:0]
			stats.RemovedURIs++
			if isSegment {
				stats.RemovedSegments++
				removedSinceMedia = true
			}
			if blockedURL {
				remember("uri")
			}
			if blockedMarker {
				remember("marker")
				if cueBreak {
					cueRemovedSeconds += duration
				}
			}
			if timedRemaining > 0 {
				timedRemaining -= duration
				if timedRemaining < 0 {
					timedRemaining = 0
				}
			}
			continue
		}

		if isSegment && removedSinceMedia {
			if keptSegments > 0 && (len(output) == 0 || output[len(output)-1] != "#EXT-X-DISCONTINUITY") {
				output = append(output, "#EXT-X-DISCONTINUITY")
			}
			removedSinceMedia = false
		}
		if isSegment {
			keptSegments++
		}
		flush()
		output = append(output, rewrite(absolute))
	}
	flush()
	return strings.Join(output, "\n"), stats
}

func rewriteAttributeURI(line, base string, rewrite RewriteFunc) (string, bool) {
	match := uriAttribute.FindStringSubmatchIndex(line)
	if match == nil {
		return line, false
	}
	raw := ""
	if match[2] >= 0 {
		raw = line[match[2]:match[3]]
	} else if match[4] >= 0 {
		raw = strings.TrimSpace(line[match[4]:match[5]])
	}
	absolute := resolveURL(base, raw)
	if IsLikelyAdURL(absolute) {
		return "", true
	}
	replacement := fmt.Sprintf(`URI="%s"`, rewrite(absolute))
	return line[:match[0]] + replacement + line[match[1]:], false
}

func resolveURL(base, value string) string {
	baseURL, baseErr := url.Parse(base)
	valueURL, valueErr := url.Parse(value)
	if baseErr != nil || valueErr != nil {
		return value
	}
	return baseURL.ResolveReference(valueURL).String()
}

func isAdDateRange(line string) bool {
	return strings.Contains(line, "SCTE35-OUT") ||
		strings.Contains(line, "SCTE35-IN") ||
		strings.Contains(line, "X-ASSET-URI") ||
		strings.Contains(line, "X-ASSET-LIST") ||
		adTokenPattern.MatchString(line)
}

func isSegmentURL(value string) bool {
	parsed, err := url.Parse(value)
	path := strings.ToLower(value)
	if err == nil {
		path = strings.ToLower(parsed.Path)
	}
	for _, suffix := range []string{".ts", ".m4s", ".mp4", ".aac", ".ac3", ".ec3", ".vtt", ".webvtt"} {
		if strings.HasSuffix(path, suffix) {
			return true
		}
	}
	return false
}

func segmentDuration(lines []string) float64 {
	for _, line := range lines {
		if strings.HasPrefix(strings.ToUpper(line), "#EXTINF:") {
			value := strings.Split(strings.TrimPrefix(line, "#EXTINF:"), ",")[0]
			duration, _ := strconv.ParseFloat(value, 64)
			return duration
		}
	}
	return 0
}

func hasPrefix(value string, prefixes []string) bool {
	for _, prefix := range prefixes {
		if strings.HasPrefix(value, prefix) {
			return true
		}
	}
	return false
}

func hasPrefixInSlice(values []string, prefix string) bool {
	for _, value := range values {
		if strings.HasPrefix(strings.ToUpper(value), prefix) {
			return true
		}
	}
	return false
}
