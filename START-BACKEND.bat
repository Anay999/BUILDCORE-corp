@echo off
title BuildCore System Launcher
echo ========================================================
echo         STARTING BUILDCORE BACKEND ^& CLOUD TUNNEL
echo ========================================================

:: 1. Launch Backend Server in a new window
start "BuildCore Backend (Port 5000)" cmd /k "cd /d C:\Users\anayp\construction-ai-system\backend && npm run dev"

:: 2. Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: 3. Launch Cloud Tunnel in a new window
start "BuildCore Cloud Tunnel" cmd /k "npx -y localtunnel --port 5000 --subdomain buildcore-anay-live"

echo.
echo [SUCCESS] Backend and Cloud Tunnel have been launched!
echo - Local Wi-Fi: http://192.168.1.71:5000/api
echo - Cloud 5G:    https://buildcore-anay-live.loca.lt/api
echo.
echo You can now open the app on your phone!
pause
