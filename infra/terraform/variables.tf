variable "do_token" {
  description = "DigitalOcean API Token (Generate at DigitalOcean Control Panel -> API)"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token (Zone.DNS, Zone.Settings Permissions)"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the domain"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name for NetPhim"
  type        = string
}

variable "vps_region" {
  description = "DigitalOcean Data Center Region (sgp1 = Singapore, fra1 = Frankfurt)"
  type        = string
  default     = "sgp1"
}

variable "vps_size" {
  description = "DigitalOcean Droplet Size (s-2vcpu-4gb, s-4vcpu-8gb)"
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "ssh_public_key" {
  description = "SSH Public Key string to inject into VPS root user"
  type        = string
}

variable "admin_ssh_cidrs" {
  description = "Trusted public CIDRs allowed to reach SSH. Keep empty to disable public SSH."
  type        = list(string)
  validation {
    condition     = length(var.admin_ssh_cidrs) > 0 && alltrue([for cidr in var.admin_ssh_cidrs : can(cidrhost(cidr, 0))])
    error_message = "Provide at least one valid trusted CIDR for SSH administration."
  }
}

variable "cloudflare_ssl_mode" {
  description = "Use full for the generated bootstrap certificate; switch to strict after installing a Cloudflare Origin CA certificate."
  type        = string
  default     = "full"

  validation {
    condition     = contains(["full", "strict"], var.cloudflare_ssl_mode)
    error_message = "cloudflare_ssl_mode must be full or strict."
  }
}

variable "cloudflare_origin_cidrs" {
  description = "Cloudflare proxy CIDRs allowed to reach the HTTP(S) origin. Review against Cloudflare's published list."
  type        = list(string)
  default = [
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22",
    "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
    "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22",
    "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
    "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
    "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32",
    "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29",
    "2c0f:f248::/32"
  ]
}
