param(
  [string]$Repository,
  [string]$PackagePath
)

$ErrorActionPreference = 'Stop'
# Safe for: local -File, or in-memory invoke from irm-install.ps1

$installRoot = Join-Path $env:LOCALAPPDATA 'Programs\Portnir'
$source = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

if ($Repository) {
  $headers = @{ 'User-Agent' = 'Portnir-Installer' }
  $release = Invoke-RestMethod "https://api.github.com/repos/$Repository/releases/latest" -Headers $headers
  $asset = $release.assets | Where-Object name -eq 'Portnir-Windows.zip' | Select-Object -First 1
  if (-not $asset) {
    throw 'Latest release does not contain Portnir-Windows.zip. Tag a release first (v0.1.0+).'
  }
  $PackagePath = Join-Path $env:TEMP 'Portnir-Windows.zip'
  Write-Host "Downloading $($asset.name)…" -ForegroundColor Cyan
  Invoke-WebRequest -UseBasicParsing $asset.browser_download_url -OutFile $PackagePath
}

if ($PackagePath) {
  $stage = Join-Path $env:TEMP ('Portnir-' + [guid]::NewGuid().ToString('N'))
  Expand-Archive $PackagePath $stage -Force
  $source = Join-Path $stage 'Portnir'
}

$guiName = 'Portnir.exe'
$cliName = 'portnir.exe'
if (-not (Test-Path (Join-Path $source $guiName))) {
  throw "$guiName was not found in the installation package."
}
if (-not (Test-Path (Join-Path $source $cliName))) {
  throw "$cliName was not found in the installation package."
}

$sourcePath = [IO.Path]::GetFullPath($source)
$version = (& (Join-Path $sourcePath $cliName) --version 2>$null)
if (-not $version) { $version = '0.1.0' }
$version = ($version | Out-String).Trim()
if (-not $version) { $version = '0.1.0' }

$targetPath = [IO.Path]::GetFullPath((Join-Path $installRoot $version))
New-Item $targetPath -ItemType Directory -Force | Out-Null

foreach ($name in @($guiName, $cliName, 'LICENSE', 'README.md')) {
  $from = Join-Path $sourcePath $name
  if (Test-Path $from) {
    Copy-Item $from -Destination (Join-Path $targetPath $name) -Force
  }
}

$path = [Environment]::GetEnvironmentVariable('Path', 'User')
$kept = @(($path -split ';') | Where-Object { $_ -and $_ -notlike "$installRoot*" })
[Environment]::SetEnvironmentVariable(
  'Path',
  (($targetPath + ';' + ($kept -join ';')).Trim(';')),
  'User'
)
$env:Path = "$targetPath;$env:Path"

# Desktop shortcut (optional, best-effort)
try {
  $desktop = [Environment]::GetFolderPath('Desktop')
  $lnkPath = Join-Path $desktop 'Portnir.lnk'
  $wsh = New-Object -ComObject WScript.Shell
  $lnk = $wsh.CreateShortcut($lnkPath)
  $lnk.TargetPath = Join-Path $targetPath $guiName
  $lnk.WorkingDirectory = $targetPath
  $lnk.Description = 'Portnir — listening ports'
  $lnk.Save()
} catch {
  # ignore shortcut failures
}

Write-Host 'Portnir installed successfully.' -ForegroundColor Green
Write-Host "Install dir: $targetPath"
Write-Host 'Open a new terminal, then:'
Write-Host '  Portnir          # desktop UI'
Write-Host '  portnir list     # CLI'
& (Join-Path $targetPath $cliName) --version
