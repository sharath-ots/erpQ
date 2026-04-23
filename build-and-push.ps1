<#
Build and push every image referenced by docker-compose.yml to GHCR.

- For services with "build:", this runs `docker compose build <service>` then retags/pushes.
- For services with only "image:", this pulls then retags/pushes.

GHCR naming convention (per service):
  ghcr.io/<GhcrOwner>/<GhcrPrefix>-<service>:<Version>
  ghcr.io/<GhcrOwner>/<GhcrPrefix>-<service>:latest

Examples:
  pwsh .\build-and-push.ps1 -GhcrOwner "my-org" -GhcrPrefix "erpq" -Version "1.2.3"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ComposeFile = "./docker-compose.yml",

    [Parameter(Mandatory = $false)]
    [string]$GhcrOwner = "",

    [Parameter(Mandatory = $false)]
    [string]$GhcrPrefix = "erpq",

    [Parameter(Mandatory = $false)]
    [string]$Version = "",

    [Parameter(Mandatory = $false)]
    [ValidateSet("patch", "minor", "major", "none")]
    [string]$Bump = "patch",

    [Parameter(Mandatory = $false)]
    [string]$VersionFile = "./VERSION",

    [Parameter(Mandatory = $false)]
    [switch]$IncludeUpstreamImages
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-DockerRunning {
    try {
        docker info | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Get-ComposeConfigJson {
    param([string]$ComposeFilePath)

    $json = docker compose -f $ComposeFilePath config --format json 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($json)) {
        throw "Failed to read compose config as JSON. Ensure Docker Compose v2 is installed and '$ComposeFilePath' exists."
    }
    return ($json | ConvertFrom-Json)
}

function Normalize-Owner {
    param([string]$Owner)
    $o = ""
    if ($null -ne $Owner) { $o = $Owner }
    $o = $o.Trim()
    if (-not $o) {
        $envOwner = ""
        if ($null -ne $env:GHCR_OWNER) { $envOwner = $env:GHCR_OWNER }
        $o = $envOwner.Trim()
    }
    if (-not $o) {
        $envOwner2 = ""
        if ($null -ne $env:GITHUB_OWNER) { $envOwner2 = $env:GITHUB_OWNER }
        $o = $envOwner2.Trim()
    }
    return $o
}

function Is-UpstreamImage {
    param([string]$Image)
    # Heuristic: images not in our repo namespace (erpq/*) are "upstream"
    if (-not $Image) { return $false }
    return ($Image -notlike "erpq/*")
}

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ("=" * $Title.Length) -ForegroundColor Cyan
}

function Ensure-GhcrOwner([string]$Owner) {
    if (-not $Owner) {
        throw "GHCR owner not set. Pass -GhcrOwner or set env var GHCR_OWNER."
    }
}

function Parse-Semver {
    param([Parameter(Mandatory = $true)][string]$Value)
    $v = $Value.Trim()
    if ($v -notmatch '^(?<maj>\d+)\.(?<min>\d+)\.(?<pat>\d+)$') {
        throw "Invalid semver '$Value'. Expected format: MAJOR.MINOR.PATCH (e.g. 1.2.3)"
    }
    return @{
        major = [int]$Matches.maj
        minor = [int]$Matches.min
        patch = [int]$Matches.pat
    }
}

function Format-Semver {
    param([Parameter(Mandatory = $true)][hashtable]$Semver)
    return "$($Semver.major).$($Semver.minor).$($Semver.patch)"
}

function Get-NextVersion {
    param(
        [string]$ExplicitVersion,
        [string]$VersionFilePath,
        [string]$BumpKind
    )

    $explicit = ""
    if ($null -ne $ExplicitVersion) { $explicit = $ExplicitVersion }
    $explicit = $explicit.Trim()
    if ($explicit) {
        # Allow explicit "dev"/custom tags, or strict semver. If it's semver, we can still write it.
        if ($explicit -match '^\d+\.\d+\.\d+$') {
            try {
                $null = Parse-Semver $explicit
                if ($VersionFilePath) {
                    Set-Content -Path $VersionFilePath -Value $explicit -NoNewline -Encoding utf8
                }
            } catch { }
        }
        return $explicit
    }

    $current = "0.1.0"
    if ($VersionFilePath -and (Test-Path -Path $VersionFilePath)) {
        $raw = (Get-Content -Path $VersionFilePath -Raw -ErrorAction Stop).Trim()
        if ($raw) { $current = $raw }
    }

    $sv = Parse-Semver $current

    switch ($BumpKind) {
        "none" { }
        "major" { $sv.major += 1; $sv.minor = 0; $sv.patch = 0 }
        "minor" { $sv.minor += 1; $sv.patch = 0 }
        default { $sv.patch += 1 } # patch
    }

    $next = Format-Semver $sv
    if ($VersionFilePath) {
        Set-Content -Path $VersionFilePath -Value $next -NoNewline -Encoding utf8
    }
    return $next
}

function Tag-And-Push {
    param(
        [Parameter(Mandatory = $true)][string]$SourceImage,
        [Parameter(Mandatory = $true)][string]$TargetImageBase,
        [Parameter(Mandatory = $true)][string]$VersionTag
    )

    $targetVersion = "$TargetImageBase`:$VersionTag"
    $targetLatest = "$TargetImageBase`:latest"

    Write-Host "Tagging:" -ForegroundColor DarkGray
    Write-Host "  $SourceImage -> $targetVersion" -ForegroundColor DarkGray
    docker tag $SourceImage $targetVersion | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to tag $SourceImage as $targetVersion" }

    Write-Host "  $SourceImage -> $targetLatest" -ForegroundColor DarkGray
    docker tag $SourceImage $targetLatest | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to tag $SourceImage as $targetLatest" }

    Write-Host "Pushing $targetVersion ..." -ForegroundColor Blue
    docker push $targetVersion
    if ($LASTEXITCODE -ne 0) { throw "Failed to push $targetVersion" }

    Write-Host "Pushing $targetLatest ..." -ForegroundColor Blue
    docker push $targetLatest
    if ($LASTEXITCODE -ne 0) { throw "Failed to push $targetLatest" }

    Write-Host "Pushed: $targetVersion, $targetLatest" -ForegroundColor Green
    return @($targetVersion, $targetLatest)
}

Write-Section "erpQ Compose → GHCR build & push"
Write-Host "Compose file: $ComposeFile" -ForegroundColor White
Write-Host "Prefix:       $GhcrPrefix" -ForegroundColor White

if (-not (Test-DockerRunning)) {
    throw "Docker is not running. Start Docker Desktop and try again."
}

$GhcrOwner = Normalize-Owner $GhcrOwner
Ensure-GhcrOwner $GhcrOwner
Write-Host "GHCR owner:   $GhcrOwner" -ForegroundColor White

if ($VersionFile) {
    Write-Host "Version file: $VersionFile" -ForegroundColor White
}
$Version = Get-NextVersion -ExplicitVersion $Version -VersionFilePath $VersionFile -BumpKind $Bump
Write-Host "Version tag:  $Version" -ForegroundColor White

Write-Host ""
Write-Host "Note: ensure you're logged in: docker login ghcr.io" -ForegroundColor Yellow

$cfg = Get-ComposeConfigJson -ComposeFilePath $ComposeFile
if (-not $cfg.services) { throw "Compose config has no services." }

$services = $cfg.services.PSObject.Properties.Name | Sort-Object
if (-not $services -or $services.Count -eq 0) { throw "No services found in compose config." }

Write-Section "Building / pulling images"

$pushed = New-Object System.Collections.Generic.List[string]

foreach ($svc in $services) {
    $svcObj = $cfg.services.$svc
    $imageRaw = ""
    if ($null -ne $svcObj.PSObject.Properties["image"]) { $imageRaw = $svcObj.PSObject.Properties["image"].Value }
    $image = $imageRaw.ToString().Trim()
    $hasBuild = ($null -ne $svcObj.PSObject.Properties["build"])

    if (-not $image) {
        Write-Host "Skipping '$svc' (no image set)" -ForegroundColor Yellow
        continue
    }

    if ((Is-UpstreamImage $image) -and (-not $IncludeUpstreamImages)) {
        Write-Host "Skipping upstream '$svc' ($image). Use -IncludeUpstreamImages to mirror to GHCR." -ForegroundColor DarkYellow
        continue
    }

    Write-Host ""
    Write-Host "Service: $svc" -ForegroundColor White
    Write-Host "Source image: $image" -ForegroundColor Gray

    if ($hasBuild) {
        Write-Host "Building via compose..." -ForegroundColor Blue
        docker compose -f $ComposeFile build $svc
        if ($LASTEXITCODE -ne 0) { throw "Compose build failed for service '$svc'." }
    } else {
        Write-Host "Pulling source image..." -ForegroundColor Blue
        docker pull $image
        if ($LASTEXITCODE -ne 0) { throw "Pull failed for image '$image'." }
    }

    $targetBase = "ghcr.io/$GhcrOwner/$GhcrPrefix-$svc"
    $pushedTags = Tag-And-Push -SourceImage $image -TargetImageBase $targetBase -VersionTag $Version
    foreach ($t in $pushedTags) { $pushed.Add($t) | Out-Null }
}

Write-Section "Summary"
if ($pushed.Count -eq 0) {
    Write-Host "No images were pushed (nothing matched, or all upstream images were skipped)." -ForegroundColor Yellow
    exit 0
}

Write-Host "Pushed tags:" -ForegroundColor White
foreach ($t in $pushed) {
    Write-Host "  - $t" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
