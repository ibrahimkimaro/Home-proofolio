@echo off
setlocal
title WSL2 Memory Optimization Setup
cd /d "%~dp0\.."

echo ========================================================
echo   WSL2 & Docker Memory Optimization Setup
echo ========================================================
echo.
echo This script creates %USERPROFILE%\.wslconfig to ensure
echo WSL2 / Docker does not consume all 16GB of your PC RAM.
echo.
echo Capping WSL2 at:
echo   - 4 GB Memory Limit (leaves 12 GB for Windows & Apps)
echo   - 4 CPU Cores (prevents PC freezing)
echo.

(
echo [wsl2]
echo memory=4GB
echo processors=4
echo swap=2GB
) > "%USERPROFILE%\.wslconfig"

echo [+] .wslconfig created successfully at:
echo     %USERPROFILE%\.wslconfig
echo.
echo To apply this limit, WSL needs a quick restart:
echo   Run scripts\fix-wsl-docker.bat or restart Docker Desktop.
echo ========================================================
pause
