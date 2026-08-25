package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strconv"
	"time"
)

const tokenTTL = time.Hour

type Signer struct {
	secret []byte
	now    func() time.Time
}

func NewSigner(secret string) *Signer {
	return &Signer{secret: []byte(secret), now: time.Now}
}

func (s *Signer) signature(rawURL string, expires int64) string {
	h := hmac.New(sha256.New, s.secret)
	h.Write([]byte(strconv.FormatInt(expires, 10)))
	h.Write([]byte("\n"))
	h.Write([]byte(rawURL))
	return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
}

func (s *Signer) Verify(rawURL, expiresRaw, signature string) bool {
	expires, err := strconv.ParseInt(expiresRaw, 10, 64)
	now := s.now().Unix()
	if err != nil || expires < now || expires > now+int64(tokenTTL/time.Second)+60 || signature == "" {
		return false
	}
	expected := s.signature(rawURL, expires)
	return hmac.Equal([]byte(signature), []byte(expected))
}

func (s *Signer) SignedProxyURL(rawURL string) string {
	expires := s.now().Add(tokenTTL).Unix()
	return "/api/hls-proxy?url=" + queryEscape(rawURL) +
		"&expires=" + strconv.FormatInt(expires, 10) +
		"&signature=" + queryEscape(s.signature(rawURL, expires))
}
