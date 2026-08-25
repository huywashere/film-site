package hls

import (
	"strconv"
	"strings"
	"testing"
)

func TestFilterRewritesEveryPlayableURI(t *testing.T) {
	manifest := "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"key.bin\"\n#EXTINF:6,\nseg-1.ts\n#EXT-X-DISCONTINUITY\n#EXTINF:6,\nseg-2.ts\n"
	filtered, stats := Filter(manifest, "https://cdn.ophim.live/movie/index.m3u8", func(value string) string {
		return "/api/hls-proxy?url=" + value
	})
	if stats.RemovedSegments != 0 {
		t.Fatalf("regular discontinuity removed media: %+v", stats)
	}
	for _, expected := range []string{"url=https://cdn.ophim.live/movie/key.bin", "url=https://cdn.ophim.live/movie/seg-1.ts", "url=https://cdn.ophim.live/movie/seg-2.ts"} {
		if !strings.Contains(filtered, expected) {
			t.Fatalf("missing rewritten URI %s in %s", expected, filtered)
		}
	}
}

func TestFilterOnlyRemovesExplicitAdBreak(t *testing.T) {
	manifest := "#EXTM3U\n#EXTINF:6,\nmain-1.ts\n#EXT-X-CUE-OUT:6\n#EXTINF:6,\nhttps://cdn-ads.example/ad-1.ts\n#EXT-X-CUE-IN\n#EXTINF:6,\nmain-2.ts\n#EXT-X-ENDLIST\n"
	filtered, stats := Filter(manifest, "https://cdn.ophim.live/movie/index.m3u8", func(value string) string { return value })
	if stats.RemovedSegments != 1 || stats.DetectedBreaks != 1 {
		t.Fatalf("unexpected stats: %+v", stats)
	}
	if strings.Contains(filtered, "ad-1.ts") || !strings.Contains(filtered, "main-2.ts") {
		t.Fatalf("incorrect filtered manifest: %s", filtered)
	}
}

func TestMalformedCueOutCannotRemoveTheRestOfAMovie(t *testing.T) {
	var builder strings.Builder
	builder.WriteString("#EXTM3U\n#EXT-X-CUE-OUT\n")
	for index := 0; index < 40; index++ {
		builder.WriteString("#EXTINF:6,\n")
		builder.WriteString("segment-")
		builder.WriteString(strconv.Itoa(index))
		builder.WriteString(".ts\n")
	}
	filtered, stats := Filter(builder.String(), "https://cdn.ophim.live/movie/index.m3u8", func(value string) string { return value })
	if stats.RemovedSegments > 30 {
		t.Fatalf("cue-out removed too much media: %+v", stats)
	}
	if !strings.Contains(filtered, "segment-39.ts") {
		t.Fatal("tail of movie was incorrectly removed")
	}
}
