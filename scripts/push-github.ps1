# Quick push to MegaCandle GitHub (run from repo root)
param(
  [Parameter(Mandatory = $true)]
  [string]$Message
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

git add -A
$staged = git diff --cached --name-only
if ($staged -match '(?i)(^|/)\.env$|MT5 Pass\.txt|\.db$') {
  Write-Error "Refusing to commit: remove secrets from staging (.env, MT5 Pass.txt, .db)"
}
if (-not $staged) {
  Write-Host "Nothing to commit."
  exit 0
}

git commit -m $Message
git push origin master
Write-Host "Pushed to https://github.com/Rasher01-cyber/MegaCandle.git"
