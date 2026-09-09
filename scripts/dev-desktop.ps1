# Stable Portnir desktop dev (Vite + Tauri).
# Vite runs in its own process so Tauri cannot kill the UI server.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$desktop = Join-Path $root "apps\desktop"
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
$env:PATH = "$cargoBin;$env:PATH"

function Test-PortListen([int]$Port) {
  $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Stop-PortnirNodes {
  Get-Process -Name "desktop" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    $cmd = $_.CommandLine
    if ($null -eq $cmd) { return }
    if ($cmd -like "*apps\desktop*" -or $cmd -like "*apps/desktop*" -or ($cmd -like "*vite*" -and $cmd -like "*1420*")) {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host "Portnir dev - stopping old instances..." -ForegroundColor DarkGreen
Stop-PortnirNodes
Start-Sleep -Seconds 1

if (-not (Test-Path (Join-Path $desktop "node_modules"))) {
  Write-Host "npm install..." -ForegroundColor DarkGreen
  Push-Location $desktop
  npm install
  Pop-Location
}

Write-Host "Starting Vite on 127.0.0.1:1420..." -ForegroundColor DarkGreen
$vite = Start-Process -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "1420", "--strictPort") `
  -WorkingDirectory $desktop `
  -PassThru `
  -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds(45)
while (-not (Test-PortListen 1420)) {
  if ((Get-Date) -gt $deadline) {
    throw "Vite did not open port 1420"
  }
  if ($vite.HasExited) {
    throw "Vite exited early (code $($vite.ExitCode))"
  }
  Start-Sleep -Milliseconds 400
}

Write-Host "Vite ready. Starting Tauri..." -ForegroundColor DarkGreen
Push-Location $desktop
try {
  npx --yes tauri dev --no-dev-server-wait
} finally {
  Pop-Location
  Write-Host "Stopping Vite..." -ForegroundColor DarkGreen
  if (-not $vite.HasExited) {
    Stop-Process -Id $vite.Id -Force -ErrorAction SilentlyContinue
  }
  Stop-PortnirNodes
}
