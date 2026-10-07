@echo off
setlocal
title Home Proofolio - zrok Tunnel
cd /d "%~dp0\.."
echo ========================================================
echo Launching zrok Tunnel for Home Proofolio...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-zrok.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo zrok exited with error code %ERRORLEVEL%.
)
echo.
pause
