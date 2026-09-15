@echo off
cd /d "%~dp0"
if not exist ".venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate
)
echo [INFO] Starting FlexPhim AI Recommendation Engine on http://localhost:8000
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
