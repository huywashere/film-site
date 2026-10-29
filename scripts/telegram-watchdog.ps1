# ══════════════════════════════════════════════════════════════
# FlexPhim - Automated Healthcheck & Telegram Alert Watchdog (Windows)
# ══════════════════════════════════════════════════════════════
# Chạy kiểm tra: powershell -ExecutionPolicy Bypass -File scripts/telegram-watchdog.ps1

$ErrorActionPreference = "Continue"
$EnvFile = Join-Path $PSScriptRoot "..\.env"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)\s*=\s*["'']?([^"'']+)["'']?') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

$BotToken = [System.Environment]::GetEnvironmentVariable("TELEGRAM_BOT_TOKEN")
$ChatId = [System.Environment]::GetEnvironmentVariable("TELEGRAM_CHAT_ID")

if (-not $BotToken -or -not $ChatId) {
    Write-Host "[!] Thieu TELEGRAM_BOT_TOKEN hoac TELEGRAM_CHAT_ID trong .env" -ForegroundColor Red
    exit 1
}

function Send-TelegramAlert($msg) {
    $uri = "https://api.telegram.org/bot$BotToken/sendMessage"
    $body = @{
        chat_id = $ChatId
        parse_mode = "HTML"
        text = $msg
    }
    try {
        $res = Invoke-RestMethod -Uri $uri -Method Post -Body $body
        return $res.ok
    } catch {
        Write-Host "[!] Loi gui Telegram: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

function Check-ServiceEndpoint($name, $url) {
    Write-Host "Kiem tra $name ($url)... " -NoNewline
    try {
        $res = Invoke-WebRequest -Uri $url -TimeoutSec 4 -UseBasicParsing -ErrorAction Stop
        if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 400) {
            Write-Host "[OK]" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "[FAIL]" -ForegroundColor Red
        $timeNow = (Get-Date).ToString("HH:mm:ss dd/MM/yyyy")
        Send-TelegramAlert "🚨 <b>CANH BAO SU CO:</b> Dich vu <b>$name</b> BI SAP!%0A⏰ Thoi gian: $timeNow%0A🌐 Endpoint: <code>$url</code>%0A⚠️ Hay kiem tra ngay tren server!" | Out-Null
        return $false
    }
    return $true
}

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "     FLEXPHIM - KIEM TRA TRANG THAI HE THONG & WATCHDOG" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# Kiem tra ket noi Telegram
Write-Host "Kiem tra ket noi Telegram bot... " -NoNewline
$testOk = Send-TelegramAlert "🔔 <b>[FlexPhim Watchdog]</b> He thong giam sat da kich hoat va ket noi thanh cong! San sang canh bao 24/7."
if ($testOk) {
    Write-Host "[THANH CONG]" -ForegroundColor Green
} else {
    Write-Host "[CHUA KET NOI DUOC]" -ForegroundColor Yellow
    Write-Host "  -> Luu y: Hay mo Telegram, tim bot va bam START thi bot moi gui duoc tin nhan!" -ForegroundColor Gray
}
Write-Host ""

Check-ServiceEndpoint "Web Frontend" "http://127.0.0.1:3000/api/health"
Check-ServiceEndpoint "Go Media Gateway" "http://127.0.0.1:8081/readyz"
Check-ServiceEndpoint "NestJS Core API" "http://127.0.0.1:3001/api/v1/health"
Check-ServiceEndpoint "Typesense Search" "http://127.0.0.1:8108/health"

Write-Host ""
Write-Host "Hoan tat kiem tra!" -ForegroundColor Cyan

