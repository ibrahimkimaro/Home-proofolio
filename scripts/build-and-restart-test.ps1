# Build and Deploy Production/Testing Instance for Home Proofolio (:3001)
# Updates the production build without interrupting local development on :3000

$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Home Proofolio - Build & Update Test Server (:3001)  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ensure docker compose is running
Write-Host "[1/3] Triggering production build in test container..." -ForegroundColor Cyan
docker compose exec frontend_test npm run build:test

if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Container might not be running yet. Starting container and building..." -ForegroundColor Yellow
    docker compose up -d frontend_test
    docker compose exec frontend_test npm run build:test
}

# 2. Restart frontend_test to load fresh build
Write-Host "[2/3] Restarting production/test server..." -ForegroundColor Cyan
docker compose restart frontend_test

# 3. Wait and verify port 3001
Write-Host "[3/3] Verifying server health on http://127.0.0.1:3001..." -ForegroundColor Cyan
$healthy = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:3001" -UseBasicParsing -TimeoutSec 2
        if ($res.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch {
        # waiting
    }
}

Write-Host ""
if ($healthy) {
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host " SUCCESS: Production/Test instance is LIVE on port 3001!" -ForegroundColor Green
    Write-Host " Remote testers can immediately access the new version." -ForegroundColor Yellow
    Write-Host " Your local development on port 3000 was NOT affected." -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "Warning: Port 3001 did not respond within 15 seconds." -ForegroundColor Yellow
    Write-Host "Check container logs: docker compose logs frontend_test" -ForegroundColor Gray
}
Write-Host ""
