Get-Content d:\HOME-PROOFOLIO\tunnel_headers.txt | Select-Object -First 15
"HTML bytes: " + (Get-Item d:\HOME-PROOFOLIO\tunnel_root.html).Length
$html = Get-Content d:\HOME-PROOFOLIO\tunnel_root.html -Raw
[regex]::Matches($html, '/_next/static/[^"]+\.js') | ForEach-Object { $_.Value } | Select-Object -First 6
