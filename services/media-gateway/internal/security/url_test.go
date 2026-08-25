package security

import (
	"net"
	"testing"
)

func TestHostAllowlistSupportsProviderWildcards(t *testing.T) {
	guard := URLGuard{AllowedHosts: []string{"*.ophim.live", "*.kkphimplayer*.com"}}
	for _, host := range []string{"cdn.ophim.live", "s1.kkphimplayer7.com"} {
		if !guard.HostAllowed(host) {
			t.Fatalf("expected %s to be allowed", host)
		}
	}
	if guard.HostAllowed("ophim.live.evil.example") {
		t.Fatal("suffix-confusion host must not be allowed")
	}
}

func TestPrivateIPsAreNeverPublic(t *testing.T) {
	for _, value := range []string{"127.0.0.1", "10.0.0.1", "169.254.1.1", "192.168.1.1", "::1", "fd00::1"} {
		if isPublicIP(net.ParseIP(value)) {
			t.Fatalf("private IP %s was accepted", value)
		}
	}
}
