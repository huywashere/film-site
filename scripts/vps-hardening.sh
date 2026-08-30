#!/usr/bin/env bash

# ════════════════════════════════════════════════════════════════════════
# NetPhim — Automated VPS Linux Hardening & Fail2Ban Setup Script
# ════════════════════════════════════════════════════════════════════════

set -e

echo "🔒 Starting Production VPS Security Hardening..."

# 1. Update OS packages
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y fail2ban ufw iptables ufw curl htop

# 2. Configure Fail2Ban for Nginx / OpenResty
echo "🛡️ Configuring Fail2Ban auto-ban rules for Nginx/OpenResty..."
cat <<'EOF' > /etc/fail2ban/jail.d/netphim-nginx.conf
[nginx-http-auth]
enabled  = true
filter   = nginx-http-auth
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 5
findtime = 600
bantime  = 86400

[nginx-botsearch]
enabled  = true
filter   = nginx-botsearch
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 10
findtime = 600
bantime  = 86400

[nginx-4xx]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 20
findtime = 60
bantime  = 86400
EOF

systemctl restart fail2ban
systemctl enable fail2ban

# 3. Kernel Anti-DDoS & Security sysctl tuning
echo "⚡ Applying Linux Kernel Anti-DDoS sysctl hardening..."
cat <<'EOF' > /etc/sysctl.d/99-netphim-security.conf
# SYN Flood Protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_synack_retries = 2

# TIME_WAIT & Connection Reuse
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Ignore ICMP Ping Sweeps
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable IP Forwarding
net.ipv4.conf.all.accept_source_route = 0
EOF

sysctl --system

# 4. UFW Firewall Setup
echo "🔥 Setting up UFW Firewall rules..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable

echo "✅ NetPhim Production VPS Hardening Completed Successfully!"
echo "📌 Remember to disable password authentication in /etc/ssh/sshd_config (PasswordAuthentication no)."
