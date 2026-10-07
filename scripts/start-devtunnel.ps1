# Microsoft Dev Tunnel Persistent Launcher for Home Proofolio
# Targets: Production/Testing Server on Port 3001 (or configurable)
# Exposes: Production Next.js build -> Fast, minified, no development HMR traffic

param(
    [string]$TunnelId = "homeproofolio",
    [int]$Port = 3001
)

$ErrorActionPreference = "Continue"

# Kill any existing orphaned devtunnel processes to prevent "TooManyConnections" collision
Get-Process -Name devtunnel -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

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
Write-Host "Tunnel ID:        $TunnelId" -ForegroundColor Yellow
Write-Host "Forwarding Port:  $Port (Production/Test Instance)" -ForegroundColor Yellow
Write-Host ""

# Check if production server on port 3001 is listening
Write-Host "[*] Checking local Production/Test Server on port $Port..." -ForegroundColor Cyan
$PortCheck = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $PortCheck) {
    Write-Host "[!] WARNING: Production/Test server is NOT listening on port $Port!" -ForegroundColor Yellow
    Write-Host "    Start it using: docker compose up -d frontend_test" -ForegroundColor Yellow
    Write-Host "    Or run: .\scripts\build-and-restart-test.bat" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "[+] Production/Test server is online on port $Port." -ForegroundColor Green
}

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
}

# Ensure target port is configured on tunnel
$PortConfigured = $TunnelInfo -match "\s+$Port\s+http\s+"
if (-not $PortConfigured) {
    Write-Host "[*] Configuring port $Port with anonymous public access on tunnel '$TunnelId'..." -ForegroundColor Cyan
    & $DevTunnel port create $TunnelId -p $Port --protocol http
    & $DevTunnel access create $TunnelId -p $Port --anonymous
    $TunnelInfo = & $DevTunnel show $TunnelId 2>&1
}

# Extract actual public URL for target port
$StableUrl = ""
if ($TunnelInfo -match "(https://[a-zA-Z0-9\.\-]+-$Port\.[a-zA-Z0-9\.\-]+devtunnels\.ms/?)") {
    $StableUrl = $Matches[1].TrimEnd('/')
} elseif ($TunnelInfo -match "(https://[a-zA-Z0-9\.\-]+devtunnels\.ms/?)") {
    $StableUrl = $Matches[1].TrimEnd('/')
}

try {
    if ($StableUrl) { Set-Clipboard -Value $StableUrl; $CopiedMsg = " (Copied to Clipboard!)" }
} catch {
    $CopiedMsg = ""
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " Stable Public URL: $StableUrl$CopiedMsg" -ForegroundColor Yellow
Write-Host " Target Port:      $Port (Production/Test Server)" -ForegroundColor White
Write-Host " Testers can open this URL directly without any login." -ForegroundColor White
Write-Host " Keep this window OPEN while hosting." -ForegroundColor Cyan
Write-Host " Press Ctrl+C at any time to stop hosting." -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

& $DevTunnel host $TunnelId
