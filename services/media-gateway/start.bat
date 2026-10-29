@echo off
cd /d "%~dp0"
set HLS_PROXY_SECRET=
for /f "tokens=1,* delims==" %%A in ('findstr /B "HLS_PROXY_SECRET=" "..\..\apps\api\.env" 2^>nul') do set "HLS_PROXY_SECRET=%%~B"
if not defined HLS_PROXY_SECRET set HLS_PROXY_SECRET=netphim-development-only-hls-secret-change-me
set MEDIA_INTERNAL_TOKEN=netphim-development-internal-token-secret
set GIN_MODE=debug
set PORT=8081
set CORE_API_URL=http://127.0.0.1:3001/api/v1
set HLS_ANALYZER_ENABLED=false
set MEDIA_CATALOG_ENABLED=true
set TYPESENSE_URL=http://127.0.0.1:8108
set REDIS_URL=redis://127.0.0.1:6379
for /f "tokens=1,* delims==" %%A in ('findstr /B "TYPESENSE_API_KEY=" "..\..\.env" 2^>nul') do if not defined TYPESENSE_API_KEY set "TYPESENSE_API_KEY=%%B"
if not defined TYPESENSE_API_KEY set TYPESENSE_API_KEY=netphim-local-typesense-api-key-32chars
for /f "tokens=1,* delims==" %%A in ('findstr /B "TMDB_API_KEY=" "..\..\.env" 2^>nul') do if not defined TMDB_API_KEY set "TMDB_API_KEY=%%B"
for /f "tokens=1,* delims==" %%A in ('findstr /B "TMDB_ACCESS_TOKEN=" "..\..\.env" 2^>nul') do if not defined TMDB_ACCESS_TOKEN set "TMDB_ACCESS_TOKEN=%%B"

echo [INFO] Starting FlexPhim Media Gateway on http://localhost:8081
go run cmd/server/main.go
