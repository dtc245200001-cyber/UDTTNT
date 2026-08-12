@echo off
title BAO TANG QUOC GIA VIET NAM - HE THONG QUAN LY
cd /d "%~dp0"

cls
echo ===================================================
echo   BAO TANG QUOC GIA VIET NAM - MUSEUM MANAGEMENT
echo ===================================================
echo.
echo Dang khoi dong he thong va mo Google Chrome...
echo.

:: Chạy Dev Server trong một cửa sổ Command Prompt riêng biệt
start "Museum_Server" cmd /k "cd /d "%~dp0" && npm.cmd run dev"

:: Chờ 3 giây bằng lệnh ping an toàn (không bao giờ bị crash)
ping 127.0.0.1 -n 4 >nul

:: Mở Google Chrome trực tiếp tới địa chỉ 127.0.0.1:5173
start "" "http://127.0.0.1:5173/"

echo He thong da khoi chay thanh cong!
ping 127.0.0.1 -n 2 >nul
exit
