@echo off
cd /d "%~dp0"
title NiHaiSha Web Workbench v3.2

python server.py 8000
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start server.
    echo Please ensure Python 3.8+ is installed and in your system PATH.
    echo.
    pause
)
