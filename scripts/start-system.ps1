# Home Proofolio - One-Click System Bringup and Health Verification
$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "        HOME PROOFOLIO - SYSTEM LAUNCHER & HEALTH       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Docker Desktop engine
Write-Host "[1/4] Checking Docker Desktop status..." -ForegroundColor Yellow
$dockerReady = $false
for ($i = 1; $i -le 10; $i++) {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        break
    }
    Write-Host "Waiting for Docker Desktop engine... ($i/10)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

if (-not $dockerReady) {
    Write-Host ""
    Write-Host "[!] Docker Desktop is not running yet." -ForegroundColor Red
    Write-Host "--> Please click and open 'Docker Desktop' from your Windows Start Menu." -ForegroundColor Yellow
    Write-Host "--> Once the Docker whale icon in your taskbar is green, press Enter to continue..." -ForegroundColor Yellow
    Read-Host
}

# 2. Start all containers
Write-Host ""
Write-Host "[2/4] Starting all containers (docker compose up -d)..." -ForegroundColor Cyan
docker compose up -d

# 3. Ensure frontend_test has production build
Write-Host ""
Write-Host "[3/4] Updating production test build on :3001..." -ForegroundColor Cyan
docker compose exec frontend_test npm run build:test
docker compose restart frontend_test

# 4. Check services
Write-Host ""
Write-Host "[4/4] Verifying services health..." -ForegroundColor Cyan
docker compose ps

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " System is ready!" -ForegroundColor Green
Write-Host " - Local Development:   http://localhost:3000" -ForegroundColor Cyan
Write-Host " - Production / Test:   http://localhost:3001" -ForegroundColor Cyan
Write-Host " - Backend API:         http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Green
