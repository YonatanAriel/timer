$ErrorActionPreference = "Stop"

$repo = "YonatanAriel/timer"
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers @{
  Accept = "application/vnd.github+json"
}
$asset = $release.assets |
  Where-Object { $_.name -match "Setup.*\.exe$" } |
  Select-Object -First 1

if (-not $asset) {
  throw "No Windows Setup .exe on the latest GitHub release. Tag a version so CI can publish one."
}

$installer = Join-Path $env:TEMP $asset.name
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installer -UseBasicParsing
Start-Process -FilePath $installer -Wait
Write-Host "Ran installer $($asset.name)"
