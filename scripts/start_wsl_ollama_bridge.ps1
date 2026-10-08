# Bridges Ollama from Windows host (172.23.240.1:11434) to Docker containers via WSL docker-desktop (0.0.0.0:11434)
Write-Host "Starting WSL Ollama Bridge on port 11434..." -ForegroundColor Cyan
while ($true) {
    try {
        wsl.exe -d docker-desktop -e sh -c "while true; do nc -lk -p 11434 -e nc 172.23.240.1 11434; sleep 0.2; done"
    } catch {
        Write-Host "WSL bridge interrupted, restarting..." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
    }
}
