@echo off
setlocal
title Home Proofolio - Set up and test the AI companion
cd /d "%~dp0\.."
echo ========================================================
echo Setting up the AI companion (Hugging Face + LangChain + MCP)...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-ai.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Process exited with code %ERRORLEVEL%.
)
echo.
pause
