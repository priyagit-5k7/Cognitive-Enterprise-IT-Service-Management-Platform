@echo off
title Smart Support Desk - Local Launcher
echo ========================================================
echo   Smart Support Desk - Local Development Environment
echo ========================================================
echo.

echo [1/3] Checking PostgreSQL service...
sc query postgresql-x64-18 | find "RUNNING" >nul
if %ERRORLEVEL% equ 0 (
    echo   [OK] PostgreSQL service is active and running.
) else (
    echo   [WARN] Attempting to start PostgreSQL service...
    net start postgresql-x64-18 >nul 2>&1
)

echo.
echo [2/3] Starting Express Backend (Port 5000)...
start "Smart Support Desk - Backend API" cmd /k "cd /d %~dp0backend && node server.js"

echo.
echo [3/3] Starting Vite Frontend (Port 5173)...
start "Smart Support Desk - Frontend UI" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo   Platform Services Launched!
echo   Frontend URL: http://localhost:5173
echo   Backend API:  http://localhost:5000/api/v1
echo   Health Check: http://localhost:5000/health
echo ========================================================
echo.
pause
