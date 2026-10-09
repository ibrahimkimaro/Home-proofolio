@echo off
setlocal
title Home Proofolio - Build and Update Test Server (:3001)
cd /d "%~dp0\.."
echo ========================================================
echo Building and Updating Production/Test Server (:3001)...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-and-restart-test.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Process exited with code %ERRORLEVEL%.
)
echo.
pause
