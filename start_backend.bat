@echo off
echo ========================================================
echo   KHOI DONG BACKEND FASTAPI + CHROMA DB + GEMINI RAG
echo   Bao Tang Lich Su Quoc Gia Viet Nam
echo ========================================================
cd /d "%~dp0backend"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
