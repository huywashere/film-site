# ── Cloudflare DNS Records ─────────────────────────────────────────
# Root Domain Record -> Floating Static IP
resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  value   = digitalocean_floating_ip.netphim_ip.ip_address
  type    = "A"
  proxied = true # Bật Đám mây màu cam Cloudflare CDN & Anti-DDoS
  ttl     = 1
}

# WWW Domain Record
resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = digitalocean_floating_ip.netphim_ip.ip_address
  type    = "A"
  proxied = true
  ttl     = 1
}

# API Subdomain Record
resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  value   = digitalocean_floating_ip.netphim_ip.ip_address
  type    = "A"
  proxied = true
  ttl     = 1
}

# ── Cloudflare SSL & Security Settings ────────────────────────────
resource "cloudflare_zone_settings_override" "netphim_security" {
  zone_id = var.cloudflare_zone_id

  settings {
    ssl                      = var.cloudflare_ssl_mode
    always_use_https         = "on"
    min_tls_version          = "1.2"
    brotli                   = "on"
    browser_check            = "on"
    challenge_ttl            = 1800
    security_level           = "medium"
    websockets               = "on"
    opportunistic_encryption = "on"
  }
}
