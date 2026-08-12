@echo off
title BAO TANG QUOC GIA VIET NAM - HE THONG QUAN LY
cls
echo ===================================================
echo   BAO TANG QUOC GIA VIET NAM - MUSEUM MANAGEMENT
echo ===================================================
echo.

:: Kiểm tra xem Port 5173 đã được lắng nghe chưa
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Dev Server hien chua chay. Dang tu dong khoi dong Server...
    start /min "Museum Dev Server" cmd /c "npm.cmd run dev"
    echo [*] Dang cho Server nạp trong 3 giay...
    timeout /t 3 /nobreak >nul
) else (
    echo [*] Dev Server dang hoat dong san sang!
)

echo [*] Dang mo Google Chrome va truy cap he thong...
start "" "http://localhost:5173/"

exit
