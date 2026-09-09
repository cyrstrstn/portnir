$ErrorActionPreference = 'Stop'
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"

cargo test -p portnir-core
cargo run -p portnir-cli -- list | Out-Null
Write-Host 'PASS core+cli' -ForegroundColor Green
