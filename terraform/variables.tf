variable "do_token" {
  description = "DigitalOcean API Token (Generate at DigitalOcean Control Panel -> API)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token (Zone.DNS, Zone.Settings Permissions)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the domain"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Primary domain name for CineVerse (e.g. cineverse.vn)"
  type        = string
  default     = "cineverse.vn"
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
  default     = ""
}
