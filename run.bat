@echo off
title BAO TANG QUOC GIA VIET NAM - HE THONG QUAN LY
cd /d "%~dp0"

cls
echo ===================================================
echo   BAO TANG QUOC GIA VIET NAM - MUSEUM MANAGEMENT
echo ===================================================
echo.
echo [1/3] Dang giai phong cong mang 5173 cu neu co...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

echo [2/3] Dang khoi dong may chu Dev Server (port 5173)...
start "Museum_Server" cmd /c "cd /d "%~dp0" && npm run dev"

echo [3/3] Dang cho he thong san sang va mo trinh duyet...
powershell -NoProfile -Command "Start-Sleep -Seconds 3" >nul 2>&1

:: Mo trinh duyet mac dinh
start "" "http://127.0.0.1:5173/"

echo.
echo ===================================================
echo   He thong da khoi chay thanh cong tai:
echo   http://127.0.0.1:5173/
echo ===================================================
powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul 2>&1
exit

