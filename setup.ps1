#!/usr/bin/env pwsh
# CineVerse Setup Script — Không cần Docker
# Sử dụng khi Docker Desktop chưa được cài/chạy

Write-Host "🎬 CineVerse Setup Script" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check Node.js
Write-Host "`n📦 Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js chưa được cài. Tải tại: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Install root deps
Write-Host "`n📦 Installing root dependencies..." -ForegroundColor Yellow
npm install

# Install API deps
Write-Host "`n📦 Installing API dependencies..." -ForegroundColor Yellow
Set-Location apps/api
npm install

# Install Web deps
Write-Host "`n📦 Installing Web dependencies..." -ForegroundColor Yellow
Set-Location ../web
npm install
Set-Location ../..

Write-Host "`n✅ Dependencies installed!" -ForegroundColor Green
Write-Host "`n⚠️  TIẾP THEO:" -ForegroundColor Yellow
Write-Host "   1. Cài PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
Write-Host "   2. Tạo database: createdb cineverse_db" -ForegroundColor Cyan
Write-Host "   3. Chạy: .\run-dev.ps1" -ForegroundColor Cyan
