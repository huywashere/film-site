@echo off
setlocal
title FlexPhim - Full Stack Launcher
cd /d "%~dp0"

echo =========================================================
echo       FLEXPHIM - KHOI DONG TOAN BO HE THONG LOCAL
echo =========================================================
echo.

echo [1/7] Khoi dong PostgreSQL, Redis, Meilisearch va RabbitMQ...
docker info >nul 2>&1
if errorlevel 1 (
  echo [FAIL] Docker Desktop chua san sang. Hay bat Docker Desktop roi chay lai.
  exit /b 1
)

for %%S in (netphim_postgres_dev movie_demo_redis_dev netphim_meilisearch netphim_rabbitmq_dev) do (
  docker inspect %%S >nul 2>&1
  if not errorlevel 1 docker start %%S >nul 2>&1
)

docker inspect netphim_postgres_dev >nul 2>&1
if errorlevel 1 docker compose -f infra/docker/docker-compose.dev.yml up -d postgres
docker inspect movie_demo_redis_dev >nul 2>&1
if errorlevel 1 docker compose -f infra/docker/docker-compose.dev.yml up -d redis
docker inspect netphim_meilisearch >nul 2>&1
if errorlevel 1 docker compose -f infra/docker/docker-compose.dev.yml up -d meilisearch
docker inspect netphim_rabbitmq_dev >nul 2>&1
if errorlevel 1 docker compose -f infra/docker/docker-compose.dev.yml up -d rabbitmq

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-local-stack.ps1 -InfrastructureOnly -TimeoutSeconds 90
if errorlevel 1 exit /b 1
echo.

echo [2/7] Ap dung Prisma migrations...
call pnpm --filter api exec prisma migrate deploy --schema prisma/schema.prisma
if errorlevel 1 (
  echo [FAIL] Database migration that bai. API se khong duoc khoi dong.
  exit /b 1
)
echo.

echo [3/7] Kiem tra Python Recommendation Engine (8000)...
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul
if errorlevel 1 start "FlexPhim - Recommendation (8000)" /min cmd /k "cd /d services\recommendation-engine && start.bat"

echo [4/7] Kiem tra Go Media Gateway (8081)...
curl.exe -fsS --max-time 4 http://127.0.0.1:8081/readyz >nul 2>&1
if errorlevel 1 start "FlexPhim - Media Gateway (8081)" /min cmd /k "cd /d services\media-gateway && start.bat"

echo [5/7] Kiem tra NestJS API (3001)...
curl.exe -fsS --max-time 4 http://127.0.0.1:3001/api/v1/health >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 3001 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
  if not exist "apps\api\dist\src\main.js" (
    echo [API] Bien dich NestJS API lan dau...
    call pnpm --filter api build
  )
  start "FlexPhim - API (3001)" /min cmd /k "pnpm --filter api start"
)

echo [6/7] Kiem tra Next.js Web (3000)...
curl.exe -fsS --max-time 8 http://127.0.0.1:3000/api/health >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 3000 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
  start "FlexPhim - Web (3000)" /min cmd /k "set MEDIA_GATEWAY_INTERNAL_URL=http://127.0.0.1:8081&& pnpm --filter web dev"
)

echo [7/7] Kiem tra Admin (3002)...
curl.exe -fsS --max-time 5 http://127.0.0.1:3002/login >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 3002 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
  start "FlexPhim - Admin (3002)" /min cmd /k "pnpm --dir apps/admin dev"
)

echo.
echo Dang doi tat ca dich vu tra ve readiness that...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-local-stack.ps1 -TimeoutSeconds 120
if errorlevel 1 (
  echo.
  echo [FAIL] Mot hoac nhieu dich vu chua san sang. Xem cua so service tuong ung.
  exit /b 1
)

echo.
echo =========================================================
echo   FLEXPHIM DA SAN SANG
echo   Web:     http://localhost:3000
echo   Admin:   http://localhost:3002
echo   API:     http://localhost:3001/api/v1/health
echo   Gateway: http://localhost:8081/readyz
echo =========================================================
exit /b 0
