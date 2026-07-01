# Mode A — local dev on this PC (docker-compose.yml + .env)
# Usage (repo root):
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-local.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-local.ps1 -Services docq,auth,comdash

param(
    [string[]]$Services = @(),
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$envFile = ".env"
if (-not (Test-Path $envFile)) {
    throw "Missing $envFile — copy from .env.example and edit."
}

$composeArgs = @("compose", "--env-file", $envFile)
if ($NoBuild) {
    $composeArgs += "up", "-d"
} else {
    $composeArgs += "up", "-d", "--build"
}

if ($Services.Count -gt 0) {
    docker @composeArgs @Services
} else {
    docker @composeArgs
}

if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed (exit $LASTEXITCODE)"
}

Write-Host ""
Write-Host "Mode A (local). See docs/DEPLOY.md — open URLs from .env (e.g. NEXT_PUBLIC_COMDASH_URL)."
