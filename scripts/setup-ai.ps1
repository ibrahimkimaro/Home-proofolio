# Set up and test the AI companion for Home Proofolio.
#   1. saves the Hugging Face token in backend\.env (asks for it once; that file is not committed)
#   2. rebuilds the backend image so the new Python packages are installed
#   3. restarts the backend and waits until it answers
#   4. runs backend\ai_smoke_test.py inside the container (token -> model -> tools -> MCP -> agent)
# Safe to run again at any time.

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$envFile = Join-Path $root "backend\.env"
$tokenLine = '(?m)^\s*(HUGGINGFACE_API_TOKEN|HF_API_TOKEN|HF_TOKEN)\s*=\s*\S+'

Write-Host ""
Write-Host "[1/4] Hugging Face token (backend\.env)..." -ForegroundColor Cyan
$existing = ""
if (Test-Path $envFile) { $existing = [System.IO.File]::ReadAllText($envFile) }
if ($existing -match $tokenLine) {
    Write-Host "      Token already saved." -ForegroundColor Green
} else {
    Write-Host "      Paste your Hugging Face token (starts with hf_) and press Enter." -ForegroundColor Yellow
    Write-Host "      Nothing is shown while you paste. Right-click pastes in this window." -ForegroundColor Gray
    $secure = Read-Host "      Token" -AsSecureString
    $token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)).Trim()
    if (-not $token.StartsWith("hf_")) {
        Write-Host "[!] That does not look like a Hugging Face token (it must start with hf_). Nothing was saved." -ForegroundColor Red
        exit 1
    }
    $text = "HUGGINGFACE_API_TOKEN=$token`r`n"
    if ($existing.Length -gt 0 -and -not $existing.EndsWith("`n")) { $text = "`r`n" + $text }
    # UTF-8 without a byte order mark: a BOM would break the first variable name in the file
    [System.IO.File]::AppendAllText($envFile, $text, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "      Saved to backend\.env" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/4] Rebuilding the backend image (installs langchain-openai and mcp, takes a few minutes)..." -ForegroundColor Cyan
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Docker is not running. Start Docker Desktop, wait until it is ready, then run this again." -ForegroundColor Red
    exit 1
}
docker compose build backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] The build failed. Scroll up for the first error (often a network timeout: just run this again)." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[3/4] Restarting the backend..." -ForegroundColor Cyan
docker compose up -d backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Could not start the backend. Check: docker compose logs backend" -ForegroundColor Red
    exit 1
}
$healthy = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 3
        if ($res.StatusCode -eq 200) { $healthy = $true; break }
    } catch {
        # still starting
    }
}
if (-not $healthy) {
    Write-Host "[!] The backend did not answer on http://127.0.0.1:8000/health within 2 minutes." -ForegroundColor Red
    Write-Host "    Last log lines:" -ForegroundColor Gray
    docker compose logs --tail 40 backend
    exit 1
}
Write-Host "      Backend is up." -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Testing the AI end to end..." -ForegroundColor Cyan
Write-Host ""
docker compose exec -T backend python ai_smoke_test.py
$result = $LASTEXITCODE

Write-Host ""
if ($result -eq 0) {
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host " SUCCESS: the AI companion is connected and answering." -ForegroundColor Green
    Write-Host " Chat with it in a terminal:" -ForegroundColor Cyan
    Write-Host "   docker compose exec backend python ai_smoke_test.py --chat" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "Some checks failed. Each [FAIL] line above says what to fix." -ForegroundColor Yellow
    Write-Host "Backend logs: docker compose logs --tail 80 backend" -ForegroundColor Gray
}
Write-Host ""
exit $result
