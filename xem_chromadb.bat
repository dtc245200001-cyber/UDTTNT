@echo off
chcp 65001 >nul
title KHO TRI THUC VECTOR CHROMADB
cd /d "%~dp0backend"

cls
python scripts\inspect_chromadb.py

echo.
echo ==================================================================================
echo   Ban co the nhan to hop phim [Windows + Shift + S] de chup anh man hinh nay!
echo ==================================================================================
echo.
pause
