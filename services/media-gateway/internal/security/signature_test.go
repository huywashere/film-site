package security

import (
	"net/url"
	"testing"
	"time"
)

func TestSignatureMatchesNextJSContract(t *testing.T) {
	signer := NewSigner("test-only-hls-secret-with-at-least-32-characters")
	signer.now = func() time.Time { return time.Unix(1_999_997_000, 0) }
	rawURL := "https://media.example.com/movie/master.m3u8"
	expires := int64(2_000_000_000)
	expected := "X_oHz-XXiNm6WYYPL1Ir01juMN29jhvVUqUvHrMTFSI"
	if actual := signer.signature(rawURL, expires); actual != expected {
		t.Fatalf("signature mismatch: %s", actual)
	}
	if !signer.Verify(rawURL, "2000000000", expected) {
		t.Fatal("expected compatible signature to verify")
	}
}

func TestSignedProxyURLCanBeVerified(t *testing.T) {
	signer := NewSigner("test-only-hls-secret-with-at-least-32-characters")
	signer.now = func() time.Time { return time.Unix(1_900_000_000, 0) }
	proxy := signer.SignedProxyURL("https://media.example.com/a b/master.m3u8")
	parsed, err := url.Parse(proxy)
	if err != nil {
		t.Fatal(err)
	}
	query := parsed.Query()
	if !signer.Verify(query.Get("url"), query.Get("expires"), query.Get("signature")) {
		t.Fatal("generated proxy URL did not verify")
	}
}
