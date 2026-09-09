@echo off
title BAO TANG QUOC GIA VIET NAM - HE THONG QUAN LY
cd /d "%~dp0"

cls
echo ===================================================
echo   BAO TANG QUOC GIA VIET NAM - MUSEUM MANAGEMENT
echo ===================================================
echo.
echo [1/4] Dang giai phong cong mang (5173 va 8000) cu neu co...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173,8000 -ErrorAction SilentlyContinue | ForEach-Object { if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

echo [2/4] Dang khoi dong may chu Backend API (port 8000)...
start "Backend_Server" cmd /c "cd /d "%~dp0backend" && set PYTHONIOENCODING=utf-8 && venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/4] Dang khoi dong may chu Frontend Dev Server (port 5173)...
start "Museum_Frontend_Server" cmd /c "cd /d "%~dp0" && npm run dev:frontend"

echo [4/4] Dang cho he thong san sang va mo trinh duyet...
powershell -NoProfile -Command "Start-Sleep -Seconds 3" >nul 2>&1

:: Mo trinh duyet mac dinh
start "" "http://127.0.0.1:5173/"

echo.
echo ===================================================
echo   He thong da khoi chay thanh cong:
echo   - Frontend: http://127.0.0.1:5173/
echo   - Backend:  http://127.0.0.1:8000/docs
echo ===================================================
powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul 2>&1
exit

