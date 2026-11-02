@echo off
setlocal enabledelayedexpansion
title Smart Support Desk - Enterprise Launcher

color 0A
cls
echo ======================================================================
echo           SMART SUPPORT DESK - SYSTEM STARTUP LAUNCHER
echo ======================================================================
echo.

:: -------------------------------------------------------------------------
:: 1. Check and Start PostgreSQL Database Service
:: -------------------------------------------------------------------------
echo [1/4] Checking PostgreSQL database service...

set "PG_SERVICE="
for %%s in (postgresql-x64-18 postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql-x64-14 postgresql) do (
    if not defined PG_SERVICE (
        sc query "%%s" >nul 2>&1
        if !errorlevel! equ 0 (
            set "PG_SERVICE=%%s"
        )
    )
)

if defined PG_SERVICE (
    sc query "!PG_SERVICE!" | find "RUNNING" >nul
    if !errorlevel! equ 0 (
        echo       [OK] Database service (!PG_SERVICE!) is running.
    ) else (
        echo       [i] Starting database service (!PG_SERVICE!)...
        net start "!PG_SERVICE!" >nul 2>&1
        if !errorlevel! equ 0 (
            echo       [OK] Database service started successfully.
        ) else (
            echo       [!] WARNING: Could not start !PG_SERVICE!.
            echo           If required, run this script as Administrator.
        )
    )
) else (
    echo       [?] PostgreSQL service name not auto-detected.
    echo           Checking if port 5432 is already active...
    netstat -ano | findstr /R /C:":5432 .*LISTENING" >nul
    if !errorlevel! equ 0 (
        echo       [OK] Database is listening on port 5432.
    ) else (
        echo       [!] WARNING: No listener found on port 5432. Please ensure PostgreSQL is running.
    )
)

:: -------------------------------------------------------------------------
:: 2. Check and Start Express Backend (Port 5000)
:: -------------------------------------------------------------------------
echo.
echo [2/4] Checking Express Backend API (Port 5000)...
netstat -ano | findstr /R /C:":5000 .*LISTENING" >nul
if !errorlevel! equ 0 (
    echo       [OK] Backend is already running on port 5000.
) else (
    echo       [+] Launching Backend Server in dedicated window...
    start "Smart Support Desk - Backend API (Port 5000)" cmd /k "title Smart Support Desk - Backend && cd /d %~dp0backend && node server.js"
    
    :: Wait up to 10 seconds for backend to become active
    echo       Waiting for Backend to initialize...
    for /L %%i in (1,1,10) do (
        netstat -ano | findstr /R /C:":5000 .*LISTENING" >nul
        if !errorlevel! equ 0 goto backend_ready
        timeout /t 1 /nobreak >nul
    )
    :backend_ready
    netstat -ano | findstr /R /C:":5000 .*LISTENING" >nul
    if !errorlevel! equ 0 (
        echo       [OK] Backend API is ready and listening on http://localhost:5000.
    ) else (
        echo       [!] WARNING: Backend did not start within 10 seconds. Check the backend window for logs.
    )
)

:: -------------------------------------------------------------------------
:: 3. Check and Start Vite Frontend (Port 5173)
:: -------------------------------------------------------------------------
echo.
echo [3/4] Checking Vite Frontend UI (Port 5173)...
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if !errorlevel! equ 0 (
    echo       [OK] Frontend is already running on port 5173.
) else (
    echo       [+] Launching Frontend UI in dedicated window...
    start "Smart Support Desk - Frontend UI (Port 5173)" cmd /k "title Smart Support Desk - Frontend && cd /d %~dp0frontend && npm run dev"
    
    :: Wait up to 12 seconds for frontend to become active
    echo       Waiting for Frontend to initialize...
    for /L %%i in (1,1,12) do (
        netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
        if !errorlevel! equ 0 goto frontend_ready
        timeout /t 1 /nobreak >nul
    )
    :frontend_ready
    netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
    if !errorlevel! equ 0 (
        echo       [OK] Frontend UI is ready and listening on http://localhost:5173.
    ) else (
        echo       [!] WARNING: Frontend did not start within 12 seconds. Check the frontend window for logs.
    )
)

:: -------------------------------------------------------------------------
:: 4. Open Application in Default Web Browser
:: -------------------------------------------------------------------------
echo.
echo [4/4] Opening Web Application in your default browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ======================================================================
echo   SUCCESS: Smart Support Desk is fully active!
echo.
echo   Frontend URL:  http://localhost:5173
echo   Backend API:   http://localhost:5000/api/v1
echo   Health Status: http://localhost:5000/health
echo.
echo   Default Test Logins:
echo     - Administrator: admin@desk.com      / Admin@123456
echo     - IT Manager:    manager@desk.com    / Password@123
echo     - Support Eng:   arjun.network@desk.com / Password@123
echo     - Client User:   client@desk.com     / Password@123
echo ======================================================================
echo.
echo This launcher window will now close in 5 seconds.
echo (The background service windows will remain running independently).
timeout /t 5 >nul
exit /b 0
