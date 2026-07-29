@echo off
echo ========================================
echo   Movie Demo - Development Setup
echo ========================================
echo.

echo [1/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo.

echo [2/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo.

echo [3/5] Checking .env file...
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file and update:
    echo   - DATABASE_URL
    echo   - JWT_SECRET
    echo   - Other credentials
    echo.
    pause
)
echo.

echo [4/5] Setting up Prisma...
cd apps\api
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma Client!
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo.

echo [5/5] Setup complete!
echo.
echo ========================================
echo   Next Steps:
echo ========================================
echo 1. Make sure PostgreSQL is running
echo 2. Make sure Redis is running
echo 3. Run migrations: npm run db:migrate
echo 4. Start development: npm run dev
echo.
echo Or use Docker:
echo   npm run docker:up
echo ========================================
echo.
pause
