# ── DigitalOcean Cloud Firewall & Security Group ───────────────────
resource "digitalocean_firewall" "cineverse_firewall" {
  name = "netphim-production-firewall"

  droplet_ids = [digitalocean_droplet.cineverse_server.id]

  # The origin is reachable only through Cloudflare, preventing WAF bypass.
  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = var.cloudflare_origin_cidrs
  }

  # Allow HTTPS from Cloudflare proxy ranges only.
  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = var.cloudflare_origin_cidrs
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.admin_ssh_cidrs
  }

  # Allow all outbound traffic (Package updates, API fetches)
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
