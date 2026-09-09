# Portnir release packager (Windows).
# Builds CLI + Tauri GUI, writes:
#   release/Portnir-Windows.zip   (IRM / portable)
#   release/Portnir/              (folder contents)
#   release/Portnir-Setup.exe     (NSIS installer, if Tauri produced one)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:PATH = "$cargoBin;$env:PATH"

$version = (Select-String -Path (Join-Path $root 'apps\desktop\src-tauri\tauri.conf.json') -Pattern '"version"\s*:\s*"([^"]+)"').Matches[0].Groups[1].Value
Write-Host "Building Portnir $version..." -ForegroundColor Cyan

Write-Host 'cargo build -p portnir-cli --release'
cargo build -p portnir-cli --release

Write-Host 'npm install + tauri build'
Push-Location (Join-Path $root 'apps\desktop')
try {
  if (-not (Test-Path 'node_modules')) {
    npm install
  }
  npm run tauri build
} finally {
  Pop-Location
}

$cliSrc = Join-Path $root 'target\release\portnir.exe'
$guiSrc = Join-Path $root 'target\release\desktop.exe'
if (-not (Test-Path $cliSrc)) { throw "Missing CLI: $cliSrc" }
if (-not (Test-Path $guiSrc)) { throw "Missing GUI: $guiSrc" }

$outDir = Join-Path $root 'release'
$stage = Join-Path $outDir 'Portnir'
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item $stage -ItemType Directory -Force | Out-Null

Copy-Item $guiSrc (Join-Path $stage 'Portnir.exe') -Force
Copy-Item $cliSrc (Join-Path $stage 'portnir.exe') -Force
Copy-Item (Join-Path $root 'LICENSE') $stage -Force
Copy-Item (Join-Path $root 'README.md') $stage -Force
Copy-Item (Join-Path $root 'scripts\install.ps1') $stage -Force

$zip = Join-Path $outDir 'Portnir-Windows.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $stage -DestinationPath $zip -Force

# Optional NSIS setup exe from Tauri
$nsis = Get-ChildItem (Join-Path $root 'target\release\bundle\nsis') -Filter '*.exe' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if ($nsis) {
  Copy-Item $nsis.FullName (Join-Path $outDir 'Portnir-Setup.exe') -Force
  Write-Host "NSIS setup: release\Portnir-Setup.exe" -ForegroundColor Green
}

Write-Host ''
Write-Host "Portnir $version packaged." -ForegroundColor Green
Write-Host "  ZIP:  $zip"
Write-Host "  DIR:  $stage"
Write-Host "  GUI:  Portnir.exe"
Write-Host "  CLI:  portnir.exe"
