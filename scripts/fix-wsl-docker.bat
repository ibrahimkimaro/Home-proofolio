@echo off
setlocal
title Fix WSL and Docker Desktop
cd /d "%~dp0\.."
echo ========================================================
echo Requesting Administrator rights to restart WSL...
echo (Click 'Yes' on the Windows prompt)
echo ========================================================
powershell -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0fix-wsl-docker.ps1\"' -Verb RunAs"
