#!/usr/bin/env pwsh
# Chạy CineVerse dev servers

Write-Host "🎬 Starting CineVerse..." -ForegroundColor Green

# Chạy API ở background
Write-Host "🚀 Starting NestJS API (port 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\api'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# Chạy Web
Write-Host "🌐 Starting Next.js Web (port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\web'; npm run dev" -WindowStyle Normal

Write-Host "`n✅ Servers starting!" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3001/api/v1" -ForegroundColor White
