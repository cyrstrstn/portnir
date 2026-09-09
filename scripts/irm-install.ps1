# Portnir one-line installer entrypoint.
# Runs fully in-memory so Restricted ExecutionPolicy does not block install.
$ErrorActionPreference = 'Stop'
$repository = 'cyrstrstn/portnir'
$installUrl = "https://raw.githubusercontent.com/$repository/main/scripts/install.ps1"
try {
  $code = (Invoke-WebRequest -UseBasicParsing -Uri $installUrl).Content
} catch {
  throw "Could not download Portnir installer from $installUrl. $($_.Exception.Message)"
}
$script = [scriptblock]::Create($code)
& $script -Repository $repository
