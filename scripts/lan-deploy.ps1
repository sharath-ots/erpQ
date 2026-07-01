# Build and deploy erpQ on the LAN VM via Docker context (no repo copy to VM).
# Prereq: run scripts/setup-lan-vm-ssh.ps1 once.
#
# Usage (repo root):
#   powershell -ExecutionPolicy Bypass -File .\scripts\lan-deploy.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\lan-deploy.ps1 -Services cityq-db,docq,apigate
#   (comma-separated works; or: -Services @('docq-db','docq','apigate'))

param(
    [string[]]$Services = @(),
    [switch]$PullOnly,
    [switch]$NoBuild
)

# PowerShell often passes "docq-db,docq,apigate" as one argument — split it.
if ($Services.Count -eq 1 -and $Services[0] -match ",") {
    $Services = $Services[0] -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$composeFile = "docker-compose.lan.build-from-source.yml"
$envFile = ".env.lan"

if (-not (Test-Path $envFile)) {
    throw "Missing $envFile - copy from .env.lan.example and edit."
}

ssh -o BatchMode=yes erpq-vm "echo VM reachable" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Cannot SSH to erpq-vm without password. Run: .\scripts\setup-lan-vm-ssh.ps1"
}

docker context use erpq-vm | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "docker context use erpq-vm failed"
}

$composeArgs = @("-f", $composeFile, "--env-file", $envFile)

if ($Services.Count -gt 0) {
    if ($PullOnly) {
        docker compose @composeArgs pull @Services
    } elseif ($NoBuild) {
        docker compose @composeArgs up -d @Services
    } else {
        docker compose @composeArgs up -d --build @Services
    }
} else {
    if ($PullOnly) {
        docker compose @composeArgs pull
    } elseif ($NoBuild) {
        docker compose @composeArgs up -d
    } else {
        docker compose @composeArgs up -d --build
    }
}

if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed (exit $LASTEXITCODE)"
}

Write-Host ""
Write-Host "Mode B (LAN build). See docs/DEPLOY.md"
Write-Host "Open: https://erpq.lan/ (hosts + mkcert on VM)"
