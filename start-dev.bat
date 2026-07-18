@echo off
echo ========================================
echo   Starting Movie Demo (Development)
echo ========================================
echo.

echo Checking .env file...
if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please run setup-dev.bat first
    pause
    exit /b 1
)
echo.

echo Starting development servers...
echo.
echo Web App will be available at: http://localhost:3000
echo API will be available at: http://localhost:3001
echo.
echo Press Ctrl+C to stop all servers
echo.

npm run dev
