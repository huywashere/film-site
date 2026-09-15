@echo off
cd /d "%~dp0.."
echo ========================================
echo   Starting FlexPhim PostgreSQL 17.11
echo ========================================
echo.

echo Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running!
    echo Please install Docker Desktop from https://www.docker.com/
    pause
    exit /b 1
)
echo Docker OK
echo.

echo Starting the repository-owned PostgreSQL...
docker compose -p netphim-dev -f infra/docker/docker-compose.dev.yml up -d --wait postgres

if %errorlevel% neq 0 (
    echo ERROR: Failed to start services!
    pause
    exit /b 1
)
echo.

echo ========================================
echo   PostgreSQL is ready!
echo ========================================
echo PostgreSQL: localhost:5433
echo   Database: movie_demo_db
echo   User: postgres
echo   Password: postgres
echo ========================================
echo.
echo Next steps:
echo 1. Run migrations: pnpm db:migrate
echo 2. Start dev servers: pnpm dev
echo.
echo To stop: docker compose -p netphim-dev -f infra/docker/docker-compose.dev.yml stop postgres
echo ========================================
pause
