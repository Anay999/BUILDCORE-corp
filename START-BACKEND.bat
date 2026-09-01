@echo off
title BuildCore System Launcher
color 0A
cls
echo ======================================================================
echo                     BUILDCORE SYSTEM LAUNCHER
echo ======================================================================
echo.

:: Detect Active IPv4
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    goto found_ip
)
:found_ip
set IP=%IP: =%

echo [STATUS] Your Laptop IP Address is: %IP%
echo [STATUS] Starting Node.js Backend Server on Port 5000...
echo.

:: 1. Start Backend in a dedicated window
start "BuildCore Backend (Port 5000)" cmd /k "title BuildCore Backend && cd /d C:\Users\anayp\construction-ai-system\backend && npm start"

:: 2. Wait 2 seconds for server to bind
timeout /t 2 /nobreak >nul

:: 3. Start Cloud Tunnel in a dedicated window
echo [STATUS] Starting Cloud 5G Tunnel...
start "BuildCore Cloud Tunnel" cmd /k "title BuildCore Cloud Tunnel && cd /d C:\Users\anayp\construction-ai-system && npx -y localtunnel --port 5000 --subdomain buildcore-anay-live"

echo.
echo ======================================================================
echo  SUCCESS! BACKEND AND CLOUD TUNNEL ARE RUNNING!
echo ======================================================================
echo.
echo  - Mobile Direct Wi-Fi / Hotspot URL : http://%IP%:5000/api
echo  - Mobile Cloud 5G URL              : https://buildcore-anay-live.loca.lt/api
echo.
echo  Open the app on your phone — it will connect automatically!
echo ======================================================================
echo.
pause
