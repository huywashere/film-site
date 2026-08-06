terraform {
  required_version = ">= 1.5.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.30"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token != "" && !can(regex("^dop_v1_your_", var.do_token)) ? var.do_token : null
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token != "" && !can(regex("^your_", var.cloudflare_api_token)) ? var.cloudflare_api_token : null
}
