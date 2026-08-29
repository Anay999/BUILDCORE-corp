@echo off
title BuildCore Mobile PWA
cd /d C:\Users\anayp\construction-ai-system\mobile
echo Starting BuildCore Mobile on port 3001...
echo.
echo After it starts, open the Network URL on your phone browser
echo (looks like http://192.168.x.x:3001)
echo.
npm run dev -- --host
pause
