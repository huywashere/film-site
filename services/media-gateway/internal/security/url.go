package security

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"path/filepath"
	"strings"
)

type URLGuard struct {
	AllowedHosts []string
	RequireHTTPS bool
	Resolver     *net.Resolver
}

func (g URLGuard) Validate(ctx context.Context, raw string) (*url.URL, error) {
	if len(raw) == 0 || len(raw) > 4096 {
		return nil, fmt.Errorf("invalid URL length")
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Hostname() == "" {
		return nil, fmt.Errorf("invalid URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("invalid URL scheme")
	}
	if g.RequireHTTPS && parsed.Scheme != "https" {
		return nil, fmt.Errorf("HTTPS is required")
	}
	if parsed.User != nil || (parsed.Port() != "" && parsed.Port() != "80" && parsed.Port() != "443") {
		return nil, fmt.Errorf("forbidden target")
	}
	if !g.HostAllowed(parsed.Hostname()) {
		return nil, fmt.Errorf("media host is not allowed")
	}
	if _, err := g.ResolvePublic(ctx, parsed.Hostname()); err != nil {
		return nil, err
	}
	return parsed, nil
}

func (g URLGuard) HostAllowed(host string) bool {
	host = strings.ToLower(strings.TrimSuffix(host, "."))
	for _, pattern := range g.AllowedHosts {
		pattern = strings.ToLower(strings.TrimSuffix(strings.TrimSpace(pattern), "."))
		if pattern == host {
			return true
		}
		matched, err := filepath.Match(pattern, host)
		if err == nil && matched {
			return true
		}
	}
	return false
}

func (g URLGuard) ResolvePublic(ctx context.Context, host string) ([]net.IP, error) {
	if ip := net.ParseIP(host); ip != nil {
		if !isPublicIP(ip) {
			return nil, fmt.Errorf("private target is forbidden")
		}
		return []net.IP{ip}, nil
	}
	resolver := g.Resolver
	if resolver == nil {
		resolver = net.DefaultResolver
	}
	addresses, err := resolver.LookupIP(ctx, "ip", host)
	if err != nil || len(addresses) == 0 {
		return nil, fmt.Errorf("cannot resolve media host")
	}
	for _, address := range addresses {
		if !isPublicIP(address) {
			return nil, fmt.Errorf("private target is forbidden")
		}
	}
	return addresses, nil
}

func isPublicIP(ip net.IP) bool {
	return ip != nil &&
		!ip.IsPrivate() &&
		!ip.IsLoopback() &&
		!ip.IsLinkLocalMulticast() &&
		!ip.IsLinkLocalUnicast() &&
		!ip.IsUnspecified() &&
		!ip.IsMulticast()
}
