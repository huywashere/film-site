output "server_public_ip" {
  description = "Elastic static IP of the NetPhim VPS server"
  value       = digitalocean_floating_ip.netphim_ip.ip_address
}

output "droplet_id" {
  description = "DigitalOcean Droplet ID"
  value       = digitalocean_droplet.netphim_server.id
}

output "ssh_command" {
  description = "Command to SSH directly into the VPS root shell"
  value       = "ssh root@${digitalocean_floating_ip.netphim_ip.ip_address}"
}

output "web_url" {
  description = "Primary URL of NetPhim"
  value       = "https://${var.domain_name}"
}
