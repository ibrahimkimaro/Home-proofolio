for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $output = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "DOCKER_IS_ONLINE"
        exit 0
    }
    Write-Host "Waiting for Docker Desktop engine to initialize... ($i/30)"
}
Write-Host "Docker Desktop startup timed out"
exit 1
