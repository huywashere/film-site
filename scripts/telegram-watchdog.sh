#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# FlexPhim - Automated Healthcheck & Telegram Alert Watchdog
# ══════════════════════════════════════════════════════════════
# Tự động ping các dịch vụ cốt lõi mỗi phút. Nếu có dịch vụ bị sập,
# sẽ lập tức gửi cảnh báo về Telegram của bạn.
#
# Cách chạy kiểm tra ngay:
#   TELEGRAM_BOT_TOKEN="xxx" TELEGRAM_CHAT_ID="yyy" bash scripts/telegram-watchdog.sh
#
# Cài đặt Cronjob chạy mỗi 1 phút trên VPS:
#   crontab -e
#   * * * * * /bin/bash /opt/movie-site/scripts/telegram-watchdog.sh > /dev/null 2>&1

set -euo pipefail

ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env"
if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    key=$(echo "$key" | tr -d '[:space:]')
    value=$(echo "$value" | sed -e 's/^[ "]*//' -e 's/[ "]*$//' -e "s/^[ ']*//" -e "s/[ ']*$//")
    if [[ "$key" == "TELEGRAM_BOT_TOKEN" && -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
      TELEGRAM_BOT_TOKEN="$value"
    elif [[ "$key" == "TELEGRAM_CHAT_ID" && -z "${TELEGRAM_CHAT_ID:-}" ]]; then
      TELEGRAM_CHAT_ID="$value"
    fi
  done < <(grep -E '^\s*TELEGRAM_(BOT_TOKEN|CHAT_ID)=' "$ENV_FILE" || true)
fi

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_CHAT_ID:-}"

if [[ -z "$BOT_TOKEN" || -z "$CHAT_ID" ]]; then
  echo "[!] Thieu TELEGRAM_BOT_TOKEN hoac TELEGRAM_CHAT_ID trong .env hoac bien moi truong."
  exit 0
fi

STATE_DIR="/tmp/flexphim-watchdog"
mkdir -p "$STATE_DIR"

send_telegram() {
  local message="$1"
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}" \
    -d "parse_mode=HTML" \
    -d "text=${message}" > /dev/null || true
}

check_service() {
  local name="$1"
  local url="$2"
  local state_file="${STATE_DIR}/${name}.state"
  local last_state="UP"
  
  if [[ -f "$state_file" ]]; then
    last_state=$(cat "$state_file")
  fi

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" || echo "000")

  if [[ "$http_code" =~ ^(200|204|301|302|307|308)$ ]]; then
    # Dịch vụ sống
    if [[ "$last_state" == "DOWN" ]]; then
      echo "UP" > "$state_file"
      local time_now
      time_now=$(date "+%H:%M:%S %d/%m/%Y")
      send_telegram "✅ <b>PHUC HOI:</b> Dich vu <b>${name}</b> da hoat dong binh thuong tro lai!%0A⏰ Thoi gian: ${time_now}%0A🌐 Endpoint: <code>${url}</code>"
    else
      echo "UP" > "$state_file"
    fi
  else
    # Dịch vụ chết
    if [[ "$last_state" != "DOWN" ]]; then
      echo "DOWN" > "$state_file"
      local time_now
      time_now=$(date "+%H:%M:%S %d/%m/%Y")
      send_telegram "🚨 <b>CANH BAO SU CO:</b> Dich vu <b>${name}</b> BI SAP!%0A❌ Ma loi HTTP: <b>${http_code}</b>%0A⏰ Thoi gian: ${time_now}%0A🌐 Endpoint: <code>${url}</code>%0A⚠️ Hay kiem tra ngay tren VPS!"
    fi
  fi
}

# Danh sách kiểm tra các endpoint trọng yếu
check_service "Web Frontend" "http://127.0.0.1:3000/api/health"
check_service "Go Media Gateway" "http://127.0.0.1:8081/readyz"
check_service "NestJS Core API" "http://127.0.0.1:3001/api/v1/health"
check_service "Typesense Search" "http://127.0.0.1:8108/health"

