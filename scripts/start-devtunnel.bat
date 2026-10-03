@echo off
setlocal
title Home Proofolio - Microsoft Dev Tunnel
cd /d "%~dp0\.."
echo ========================================================
echo Launching Microsoft Dev Tunnel for Home Proofolio...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-devtunnel.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Dev Tunnel exited with error code %ERRORLEVEL%.
    pause
)
