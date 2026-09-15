@echo off
cd /d "%~dp0"
set HLS_PROXY_SECRET=netphim-development-only-hls-secret-change-me
set MEDIA_INTERNAL_TOKEN=netphim-development-internal-token-secret
set GIN_MODE=debug
set PORT=8081
set CORE_API_URL=http://127.0.0.1:3001/api/v1
set HLS_ANALYZER_ENABLED=false
set MEDIA_CATALOG_ENABLED=true
set MEILI_URL=http://127.0.0.1:7700
for /f "tokens=1,* delims==" %%A in ('findstr /B "MEILI_MASTER_KEY=" "..\..\.env" 2^>nul') do if not defined MEILI_MASTER_KEY set "MEILI_MASTER_KEY=%%B"
if not defined MEILI_MASTER_KEY set MEILI_MASTER_KEY=netphim-local-meili-master-key-32chars

echo [INFO] Starting FlexPhim Media Gateway on http://localhost:8081
go run cmd/server/main.go
