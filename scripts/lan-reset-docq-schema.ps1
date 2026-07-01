# Reset docQ module schema on the shared platform Postgres (cityq-db).
# Drops only docq.* tables — other module schemas (hrq, …) are untouched.
#
# Usage (repo root):
#   powershell -ExecutionPolicy Bypass -File .\scripts\lan-reset-docq-schema.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$envFile = ".env.lan"
$composeFile = "docker-compose.lan.build-from-source.yml"

if (-not (Test-Path $envFile)) {
    throw "Missing $envFile"
}

docker context use erpq-vm | Out-Null
$composeArgs = @("-f", $composeFile, "--env-file", $envFile)

Write-Host "Ensuring cityq-db is up..."
docker compose @composeArgs up -d cityq-db

$dbPass = (Select-String -Path $envFile -Pattern '^CITYQ_DB_PASSWORD=' | Select-Object -First 1).Line
if (-not $dbPass) {
    $dbPass = (Select-String -Path $envFile -Pattern '^DOCQ_DB_PASSWORD=' | Select-Object -First 1).Line
}
if (-not $dbPass) {
    throw "Set CITYQ_DB_PASSWORD in $envFile"
}

Write-Host "Dropping and recreating schema docq..."
docker compose @composeArgs exec -T cityq-db psql -U cityq -d cityq -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS docq CASCADE; CREATE SCHEMA docq;"

Write-Host "Restarting docq (migrations will re-apply)..."
docker compose @composeArgs up -d --build docq

Write-Host "Done. Re-sign in with Zoho if WorkDrive tokens were cleared."
