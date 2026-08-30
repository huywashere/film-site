# ── SSH Key Resource ──────────────────────────────────────────────
resource "digitalocean_ssh_key" "admin" {
  name       = "netphim-admin-key"
  public_key = var.ssh_public_key
}

# ── Reserved Static IP (Elastic IP) ────────────────────────────────
resource "digitalocean_floating_ip" "netphim_ip" {
  region = var.vps_region
}

# ── VPS Server Instance (Droplet) ──────────────────────────────────
resource "digitalocean_droplet" "netphim_server" {
  name     = "netphim-production-vps"
  image    = "ubuntu-24-04-x64"
  region   = var.vps_region
  size     = var.vps_size
  ssh_keys = [digitalocean_ssh_key.admin.id]

  # Auto-provisioning Script (Installs Docker, Docker Compose, Git, UFW Firewall)
  user_data = <<-EOF
    #!/bin/bash
    set -e
    
    # Update system packages
    apt-get update && apt-get upgrade -y
    apt-get install -y curl git ufw htop fail2ban ca-certificates apt-transport-https

    # Install Docker & Docker Compose Plugin
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable Docker Service
    systemctl enable docker
    systemctl start docker

    # Configure UFW Security Firewall
    ufw default deny incoming
    ufw default allow outgoing
    ${join("\n    ", [for cidr in var.admin_ssh_cidrs : "ufw allow from ${cidr} to any port 22 proto tcp"])}
    ${join("\n    ", [for cidr in var.cloudflare_origin_cidrs : "ufw allow from ${cidr} to any port 80 proto tcp"])}
    ${join("\n    ", [for cidr in var.cloudflare_origin_cidrs : "ufw allow from ${cidr} to any port 443 proto tcp"])}
    ufw --force enable

    # Create swap space (2GB) for stability
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    echo "NetPhim server provisioning complete"
  EOF

  tags = ["netphim", "production", "movie-site"]
}

# Assign Floating IP to Droplet
resource "digitalocean_floating_ip_assignment" "netphim_ip_assign" {
  ip_address = digitalocean_floating_ip.netphim_ip.ip_address
  droplet_id = digitalocean_droplet.netphim_server.id
}
