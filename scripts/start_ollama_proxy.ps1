# High-performance async TCP proxy for Docker <-> Ollama on Windows
# Listens on 0.0.0.0:11435 and forwards all traffic to 127.0.0.1:11434

$listenPort = 11435
$targetHost = "127.0.0.1"
$targetPort = 11434

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $listenPort)
$listener.Start()
Write-Host "TCP Proxy listening on 0.0.0.0:$listenPort -> ${targetHost}:${targetPort}..." -ForegroundColor Green

function Relay-Stream($inStream, $outStream) {
    [byte[]]$buffer = New-Object byte[] 65536
    try {
        while (($read = $inStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $outStream.Write($buffer, 0, $read)
            $outStream.Flush()
        }
    }
    catch {}
    finally {
        try { $inStream.Close() } catch {}
        try { $outStream.Close() } catch {}
    }
}

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        [System.Threading.ThreadPool]::QueueUserWorkItem({
                param($clientObj)
                try {
                    $target = New-Object System.Net.Sockets.TcpClient
                    $target.Connect("127.0.0.1", 11434)
                
                    $clientStream = $clientObj.GetStream()
                    $targetStream = $target.GetStream()

                    [System.Threading.ThreadPool]::QueueUserWorkItem({
                            param($pair)
                            Relay-Stream $pair[0] $pair[1]
                        }, @($clientStream, $targetStream)) | Out-Null

                    Relay-Stream $targetStream $clientStream
                }
                catch {
                    try { $clientObj.Close() } catch {}
                }
            }, $client) | Out-Null
    }
    catch {
        Start-Sleep -Milliseconds 100
    }
}
