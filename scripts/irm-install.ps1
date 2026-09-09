# Portnir one-line installer — downloads Setup.exe from latest GitHub Release and runs it.
# Runs in memory so Restricted ExecutionPolicy does not block the entrypoint.
$ErrorActionPreference = 'Stop'
$repository = 'cyrstrstn/portnir'
$assetName = 'Portnir-Setup.exe'
$headers = @{ 'User-Agent' = 'Portnir-Installer' }

Write-Host "Fetching latest release for $repository…" -ForegroundColor Cyan
$release = Invoke-RestMethod "https://api.github.com/repos/$repository/releases/latest" -Headers $headers
$asset = $release.assets | Where-Object name -eq $assetName | Select-Object -First 1
if (-not $asset) {
  throw "Latest release ($($release.tag_name)) does not contain $assetName."
}

$out = Join-Path $env:TEMP $assetName
Write-Host "Downloading $assetName ($($release.tag_name))…" -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -Uri $asset.browser_download_url -OutFile $out -Headers $headers

Write-Host "Starting installer…" -ForegroundColor Cyan
Start-Process -FilePath $out
Write-Host "Launcher started: $out" -ForegroundColor Green
Write-Host "Finish the Setup wizard, then open Portnir from the Start menu."
