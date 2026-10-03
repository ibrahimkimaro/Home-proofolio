# Self-elevate to Administrator if not already elevated
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges to restart WSL services..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Resetting Unresponsive WSL & Docker Desktop Services " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Terminating all stuck Docker and WSL processes..." -ForegroundColor Yellow
Get-Process -Name "Docker Desktop", "com.docker.backend", "com.docker.build", "docker", "docker-compose", "docker-agent", "wsl", "wslhost", "wslrelay" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "[2/4] Force-restarting Windows WSL Services (wslservice & LxssManager)..." -ForegroundColor Yellow
# Stop services directly without running wsl.exe (which causes the hang)
Stop-Service -Name "wslservice" -Force -ErrorAction SilentlyContinue
Stop-Service -Name "LxssManager" -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Start-Service -Name "wslservice" -ErrorAction SilentlyContinue
Start-Service -Name "LxssManager" -ErrorAction SilentlyContinue

Write-Host "[+] Services restarted successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "[3/4] Launching Docker Desktop fresh..." -ForegroundColor Yellow
$dockerDesktopPath = "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
if (Test-Path $dockerDesktopPath) {
    Start-Process $dockerDesktopPath
    Write-Host "[+] Docker Desktop started!" -ForegroundColor Green
} else {
    Write-Host "[!] Could not locate Docker Desktop executable at $dockerDesktopPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Please wait about 20-30 seconds for Docker Desktop" -ForegroundColor Yellow
Write-Host "to finish loading in the taskbar, then run:" -ForegroundColor Yellow
Write-Host "   docker compose up -d" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: If the Windows kernel itself refuses to release vmmemWSL," -ForegroundColor Gray
Write-Host "a 30-second PC Restart (Windows Start -> Restart) is the 100% fix." -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
