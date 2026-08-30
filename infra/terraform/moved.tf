# Preserve existing production resources while normalizing Terraform addresses.
# Remove these blocks only after every environment has applied the migration.
moved {
  from = digitalocean_floating_ip.cineverse_ip
  to   = digitalocean_floating_ip.netphim_ip
}

moved {
  from = digitalocean_droplet.cineverse_server
  to   = digitalocean_droplet.netphim_server
}

moved {
  from = digitalocean_floating_ip_assignment.cineverse_ip_assign
  to   = digitalocean_floating_ip_assignment.netphim_ip_assign
}

moved {
  from = digitalocean_firewall.cineverse_firewall
  to   = digitalocean_firewall.netphim_firewall
}

moved {
  from = cloudflare_zone_settings_override.cineverse_security
  to   = cloudflare_zone_settings_override.netphim_security
}
