# Keep DevTunnel permanently running with auto-reconnect
Write-Host "Starting persistent DevTunnel supervisor for Home Proofolio..." -ForegroundColor Cyan

while ($true) {
    try {
        Write-Host ">>> Launching devtunnel host homeproofolio at $(Get-Date)..." -ForegroundColor Green
        & d:\HOME-PROOFOLIO\tools\devtunnel.exe host homeproofolio
    } catch {
        Write-Host "Error in devtunnel process: $_" -ForegroundColor Red
    }
    Write-Host "DevTunnel disconnected. Reconnecting in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}
