@echo off
title NetPhim - Full Stack Launcher
cd /d "%~dp0"

echo =========================================================
echo       NETPHIM - KHOI DONG TOAN BO HE THONG LOCAL
echo =========================================================
echo.

rem 1. Docker infrastructure for local development
echo [1/5] Kiem tra PostgreSQL, Redis, Meilisearch va RabbitMQ...
docker info >nul 2>&1
if not errorlevel 1 (
    docker compose -p netphim-dev -f infra/docker/docker-compose.dev.yml up -d --wait postgres

    docker inspect movie_demo_redis_dev >nul 2>&1
    if errorlevel 1 (docker compose -f infra/docker/docker-compose.dev.yml up -d redis) else (docker start movie_demo_redis_dev >nul 2>&1)

    docker inspect netphim_meilisearch >nul 2>&1
    if errorlevel 1 (docker compose -f infra/docker/docker-compose.dev.yml up -d meilisearch) else (docker start netphim_meilisearch >nul 2>&1)

    docker inspect netphim_rabbitmq_dev >nul 2>&1
    if errorlevel 1 (docker compose -f infra/docker/docker-compose.dev.yml up -d rabbitmq) else (docker start netphim_rabbitmq_dev >nul 2>&1)
) else (
    echo [WARN] Docker Desktop chua bat, bo qua cac dich vu Docker.
)
echo.

rem 2. Python AI Engine (Port 8000)
echo [2/5] Kiem tra Python AI Engine (Port 8000)...
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [OK] Python AI Engine da dang chay san tren cong 8000.
) else (
    echo [INFO] Dang khoi dong Python AI Recommender Engine...
    start "NetPhim - Python AI Engine (8000)" cmd /k "cd /d services\recommendation-engine && start.bat"
    ping -n 3 127.0.0.1 >nul
)
echo.

rem 3. Go Media Gateway (Port 8081)
echo [3/5] Kiem tra Go Media Gateway (Port 8081)...
netstat -ano | findstr ":8081 " | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [OK] Go Media Gateway da dang chay san tren cong 8081.
) else (
    echo [INFO] Dang khoi dong Go Media Gateway...
    start "NetPhim - Go Media Gateway (8081)" cmd /k "cd /d services\media-gateway && start.bat"
    ping -n 3 127.0.0.1 >nul
)
echo.

rem 4. NestJS API Core (Port 3001)
echo [4/5] Kiem tra NestJS API Core (Port 3001)...
curl.exe -fsS --max-time 5 http://127.0.0.1:3001/api/v1/health >nul 2>&1
if not errorlevel 1 (
    echo [OK] NestJS API Core da dang chay san tren cong 3001.
) else (
    rem A process can keep the port open while its event loop is wedged. Remove
    rem that stale process before launching a healthy API instance.
    for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do taskkill /PID %%P /T /F >nul 2>&1
    echo [INFO] Dang khoi dong NestJS API Core...
    start "NetPhim - NestJS API (3001)" cmd /k "pnpm --filter api dev"
    ping -n 4 127.0.0.1 >nul
)
echo.

rem 5. Next.js Web Frontend (Port 3000)
echo [5/5] Kiem tra Next.js Web Frontend (Port 3000)...
curl.exe -fsS --max-time 20 http://127.0.0.1:3000/api/health >nul 2>&1
if not errorlevel 1 (
    echo [OK] Next.js Web Frontend da dang chay san tren cong 3000.
    echo.
    echo =========================================================
    echo   TAT CA DICH VU DEU DANG HOAT DONG SAN SANG!
    echo   - Web Client: http://localhost:3000
    echo   - API Core:   http://localhost:3001
    echo   - Python AI:  http://localhost:8000/docs
    echo   - Go Gateway: http://localhost:8081/readyz
    echo =========================================================
    echo.
) else (
    rem Listening is not enough: a long-lived Next dev worker may retain the
    rem socket while no longer serving responses.
    for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /PID %%P /T /F >nul 2>&1
    ping -n 2 127.0.0.1 >nul
    if exist "apps\web\.next-dev" move "apps\web\.next-dev" "apps\web\.next-dev.stale-%RANDOM%" >nul
    echo [INFO] Dang khoi dong Next.js Web Frontend...
    set MEDIA_GATEWAY_INTERNAL_URL=http://127.0.0.1:8081
    echo.
    echo =========================================================
    echo   Tat ca cac service da duoc kich hoat!
    echo   - Web Client: http://localhost:3000
    echo   - API Core:   http://localhost:3001
    echo   - Python AI:  http://localhost:8000/docs
    echo   - Go Gateway: http://localhost:8081/readyz
    echo =========================================================
    echo.
    pnpm --filter web dev
)
