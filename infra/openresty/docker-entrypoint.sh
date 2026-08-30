#!/usr/bin/env sh
set -eu

CERT_DIR=/etc/openresty/ssl
CERT_FILE="$CERT_DIR/fullchain.pem"
KEY_FILE="$CERT_DIR/privkey.pem"

mkdir -p "$CERT_DIR"

# A self-signed origin certificate keeps Cloudflare "Full" encrypted on first
# boot. Replace these files with a Cloudflare Origin CA certificate, then use
# "Full (strict)" in production.
if [ ! -s "$CERT_FILE" ] || [ ! -s "$KEY_FILE" ]; then
  echo "[openresty] No origin certificate found; generating a local self-signed certificate"
  openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
    -subj "/CN=netphim-origin" \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" >/dev/null 2>&1
  chmod 600 "$KEY_FILE"
fi

if [ "${1:-}" = "/usr/local/openresty/bin/openresty" ]; then
  /usr/local/openresty/bin/openresty -t
fi
exec "$@"
