# ngrok Production/Test Tunnel Launcher for Home Proofolio
# Targets: Port 3001 (Production Build Instance)
# Exposes: Minified, pre-rendered Next.js build without dev HMR traffic

param(
    [int]$Port = 3001
)

$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         Home Proofolio - ngrok Tunnel Launcher         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Forwarding Port: $Port (Production/Test Server)" -ForegroundColor Yellow
Write-Host ""

# Check Production Server on port 3001
Write-Host "[*] Checking local Production/Test Server on port $Port..." -ForegroundColor Cyan
$PortCheck = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $PortCheck) {
    Write-Host "[!] WARNING: Production/Test server is NOT listening on port $Port!" -ForegroundColor Yellow
    Write-Host "    Make sure to start the test container:" -ForegroundColor Yellow
    Write-Host "    docker compose up -d frontend_test" -ForegroundColor Yellow
    Write-Host "    Or run: .\scripts\build-and-restart-test.bat" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "[+] Production/Test server is online on port $Port." -ForegroundColor Green
}

# Locate ngrok
$Ngrok = "ngrok"
if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    $wingetNgrok = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ngrok.exe"
    if (Test-Path $wingetNgrok) {
        $Ngrok = $wingetNgrok
    } else {
        Write-Host "Error: ngrok was not found in PATH or WinGet links." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Starting ngrok tunnel for port $Port..." -ForegroundColor Cyan
Write-Host "Keep this window OPEN while sharing." -ForegroundColor Gray
Write-Host "Testers will receive the fast production build without HMR traffic." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

& $Ngrok http $Port
