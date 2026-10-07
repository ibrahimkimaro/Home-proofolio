@echo off
setlocal
title Home Proofolio - ngrok Production Tunnel (:3001)
cd /d "%~dp0\.."
echo ========================================================
echo Launching ngrok Tunnel for Production/Test (:3001)...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-ngrok.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ngrok exited with error code %ERRORLEVEL%.
)
echo.
pause
