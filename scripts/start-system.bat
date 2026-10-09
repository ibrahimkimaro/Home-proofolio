@echo off
setlocal
title Home Proofolio - Start System
cd /d "%~dp0\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-system.ps1"
pause
