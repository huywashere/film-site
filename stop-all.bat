@echo off
title NetPhim - Stop All Services
cd /d "%~dp0"

echo =========================================================
echo             NETPHIM - DUNG TOAN BO SERVICES
echo =========================================================
echo.

echo [1/3] Giai phong cac port: 3000, 3001, 8000, 8081...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(3000, 3001, 8000, 8081) } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [2/3] Dung cac container Docker Redis va Rust (neu co)...
docker compose --project-directory . -f infra/docker/docker-compose.yml stop redis media-worker-rs >nul 2>&1

echo [3/3] Don dep cache de tiet kiem bo nho...
if exist "apps\web\.next\cache" rmdir /s /q "apps\web\.next\cache" >nul 2>&1

echo.
echo =========================================================
echo   Da tat toan bo services sach se va giai phong RAM!
echo =========================================================
echo.
pause
