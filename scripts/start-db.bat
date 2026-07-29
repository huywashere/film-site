@echo off
echo ========================================
echo   Starting PostgreSQL + Redis (Docker)
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

echo Starting PostgreSQL and Redis...
docker-compose -f docker-compose.dev.yml up -d

if %errorlevel% neq 0 (
    echo ERROR: Failed to start services!
    pause
    exit /b 1
)
echo.

echo Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul
echo.

echo ========================================
echo   Services are running!
echo ========================================
echo PostgreSQL: localhost:5432
echo   Database: cineverse_db
echo   User: cineverse
echo   Password: cineverse123
echo.
echo Redis: localhost:6379
echo ========================================
echo.
echo Next steps:
echo 1. Run migrations: npm run db:migrate
echo 2. Start dev servers: npm run dev
echo.
echo To stop: docker-compose -f docker-compose.dev.yml down
echo ========================================
pause
