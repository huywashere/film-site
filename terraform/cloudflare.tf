# ── Cloudflare DNS Records ─────────────────────────────────────────
data "cloudflare_zone" "cineverse" {
  count   = var.cloudflare_zone_id != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
}

# Root Domain Record (cineverse.vn -> Floating Static IP)
resource "cloudflare_record" "root" {
  count   = var.cloudflare_zone_id != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "@"
  value   = digitalocean_floating_ip.cineverse_ip.ip_address
  type    = "A"
  proxied = true # Bật Đám mây màu cam Cloudflare CDN & Anti-DDoS
  ttl     = 1
}

# WWW Domain Record (www.cineverse.vn)
resource "cloudflare_record" "www" {
  count   = var.cloudflare_zone_id != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = digitalocean_floating_ip.cineverse_ip.ip_address
  type    = "A"
  proxied = true
  ttl     = 1
}

# API Subdomain Record (api.cineverse.vn)
resource "cloudflare_record" "api" {
  count   = var.cloudflare_zone_id != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "api"
  value   = digitalocean_floating_ip.cineverse_ip.ip_address
  type    = "A"
  proxied = true
  ttl     = 1
}

# ── Cloudflare SSL & Security Settings ────────────────────────────
resource "cloudflare_zone_settings_override" "cineverse_security" {
  count   = var.cloudflare_zone_id != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id

  settings {
    # Cloudflare provider value `strict` maps to dashboard mode “Full (strict)”.
    ssl                      = "strict"
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
