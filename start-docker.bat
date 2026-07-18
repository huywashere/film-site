@echo off
echo ========================================
echo   Starting Movie Demo (Docker)
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
docker --version
echo.

echo Checking .env file...
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file for Docker setup
    echo.
    pause
)
echo.

echo Building Docker images...
docker-compose build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build Docker images!
    pause
    exit /b 1
)
echo.

echo Starting Docker containers...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start containers!
    pause
    exit /b 1
)
echo.

echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul
echo.

echo Running database migrations...
docker-compose exec -T api npx prisma migrate deploy
echo.

echo ========================================
echo   Services are running!
echo ========================================
echo Web App: http://localhost
echo API: http://localhost/api
echo.
echo To view logs: npm run docker:logs
echo To stop: npm run docker:down
echo ========================================
echo.
pause
