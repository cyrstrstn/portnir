$ErrorActionPreference = 'Stop'
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"

cargo test -p portguard-core
cargo run -p portguard-cli -- list | Out-Null
Write-Host 'PASS core+cli' -ForegroundColor Green
