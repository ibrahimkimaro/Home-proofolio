# Microsoft Dev Tunnel Persistent Launcher for Home Proofolio
# Stable URL: https://homeproofolio.devtunnels.ms or https://homeproofolio-3000.<region>.devtunnels.ms
# Exposes: Docker Frontend (port 3000) -> which automatically proxies /api (8000) and /socket (4000)

param(
    [string]$TunnelId = "homeproofolio",
    [int]$Port = 3000
)

$ErrorActionPreference = "Continue"

# Locate devtunnel CLI
$DevTunnel = "$PSScriptRoot\..\tools\devtunnel.exe"
if (-not (Test-Path $DevTunnel)) {
    if (Get-Command devtunnel -ErrorAction SilentlyContinue) {
        $DevTunnel = "devtunnel"
    } else {
        Write-Host "Error: devtunnel.exe not found at $DevTunnel and not in PATH." -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Home Proofolio - Microsoft Dev Tunnel Launcher       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Tunnel ID: $TunnelId" -ForegroundColor Yellow
Write-Host "Forwarding Port: $Port (Docker Frontend + Proxies)" -ForegroundColor Yellow
Write-Host ""

# Check login status
$UserStatus = & $DevTunnel user show 2>&1
if ($UserStatus -match "Not logged in") {
    Write-Host "[!] You need to log in to Microsoft Dev Tunnels once." -ForegroundColor Yellow
    Write-Host "Choose your login method:" -ForegroundColor Cyan
    Write-Host "  1) Browser login (Microsoft / Entra ID account)"
    Write-Host "  2) GitHub account login"
    Write-Host "  3) Device code login (open URL & enter code)"
    $choice = Read-Host "Select option [1-3] (default: 1)"
    
    switch ($choice) {
        "2" { & $DevTunnel user login --github }
        "3" { & $DevTunnel user login --use-device-code-auth }
        Default { & $DevTunnel user login --use-browser-auth }
    }
    
    $UserStatus = & $DevTunnel user show 2>&1
    if ($UserStatus -match "Not logged in") {
        Write-Host "Login was not completed. Please run: devtunnel user login" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[+] Logged in: $UserStatus" -ForegroundColor Green

# Check if the persistent tunnel already exists
$TunnelInfo = & $DevTunnel show $TunnelId 2>&1
$Exists = $TunnelInfo -notmatch "Tunnel not found" -and $TunnelInfo -notmatch "error"

if (-not $Exists) {
    Write-Host "[*] Creating persistent named tunnel '$TunnelId'..." -ForegroundColor Cyan
    & $DevTunnel create $TunnelId --allow-anonymous --description "Home Proofolio persistent public tunnel for testers"
    
    Write-Host "[*] Configuring port $Port with anonymous public access..." -ForegroundColor Cyan
    & $DevTunnel port create $TunnelId -p $Port --protocol http
    & $DevTunnel access create $TunnelId -p $Port --anonymous
    Write-Host "[+] Persistent tunnel '$TunnelId' successfully created and configured!" -ForegroundColor Green
} else {
    Write-Host "[+] Reusing existing persistent tunnel '$TunnelId' (Identity & URL preserved)." -ForegroundColor Green
}

Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host " Starting Dev Tunnel Host for Home Proofolio..." -ForegroundColor Cyan
Write-Host " Stable URL: https://$TunnelId.devtunnels.ms" -ForegroundColor Yellow
Write-Host " Testers can open this URL directly without any login." -ForegroundColor Yellow
Write-Host " Press Ctrl+C at any time to stop hosting." -ForegroundColor Gray
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

& $DevTunnel host $TunnelId
