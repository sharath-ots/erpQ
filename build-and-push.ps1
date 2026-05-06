<#
Build and push images referenced by a Compose file to GHCR.

Production workflow (typical):
  1. Build and push app images from docker-compose.yml (services use erpq/* images + build contexts).
     Windows (built-in): powershell -ExecutionPolicy Bypass -File .\build-and-push.ps1 -GhcrOwner "org" -Bump patch
     PowerShell 7+ if installed: pwsh -File .\build-and-push.ps1 -GhcrOwner "org" -Bump patch
     Use -EnvFile if compose interpolates variables from a file.
  2. On the server .env.production: GHCR_OWNER / GHCR_PREFIX must match -GhcrOwner / -GhcrPrefix; APP_VERSION must
     match the tag you just pushed (same as ./VERSION when using -Bump). Production compose has no builds —
     it only pulls those GHCR images (see docker-compose.production.yml header).
  3. On the server: bash ./deploy.sh   (uses docker-compose.production.yml + pulls from GHCR).

Notes:
  - docker-compose.production.yml has no "build:" blocks — only pre-built GHCR images.
    Pointing this script at production compose will pull public images and mirror them to GHCR,
    not rebuild your app from source. Use docker-compose.yml for real builds.
  - Linux/mac/Git Bash equivalent: ./debug-production.sh push --owner <owner> [--env-file .env]

- For services with "build:", runs `docker compose build <service>` then retags/pushes.
- For services with only "image:", pulls then retags/pushes.

GHCR naming convention (per service name in compose):
  ghcr.io/<GhcrOwner>/<GhcrPrefix>-<service>:<Version>
  ghcr.io/<GhcrOwner>/<GhcrPrefix>-<service>:latest

Examples:
  powershell -ExecutionPolicy Bypass -File .\build-and-push.ps1 -GhcrOwner "my-org" -GhcrPrefix "erpq" -Version "1.2.3"
  powershell -ExecutionPolicy Bypass -File .\build-and-push.ps1 -EnvFile ".\.env" -GhcrOwner "my-org" -Bump patch

GHCR login (required before push):
  - Pass -GhcrPat and optionally -GhcrLoginUser, or set env GHCR_TOKEN / GHCR_PAT and GHCR_LOGIN_USER.
  - Or edit the $DefaultGhcr* variables at the top of the script (do not commit real tokens).
  - Password is always a PAT with write:packages / read:packages — never your GitHub account password.
  403 Forbidden: wrong/missing login, expired PAT, or no permission for that namespace (org SSO, etc.).
  https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ComposeFile = "./docker-compose.yml",

    [Parameter(Mandatory = $false)]
    [string]$EnvFile = "",

    [Parameter(Mandatory = $false)]
    [string]$GhcrOwner = "",

    # PAT with write:packages. Prefer env GHCR_TOKEN — avoid committing secrets in the script defaults block.
    [Parameter(Mandatory = $false)]
    [string]$GhcrPat = "",

    # GitHub username for docker login (your account). For org namespaces (-GhcrOwner orgname), this is still YOUR username.
    [Parameter(Mandatory = $false)]
    [string]$GhcrLoginUser = "",

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

# -----------------------------------------------------------------------------
# Optional local defaults (edit for your machine). Leave blank to use -Ghcr* params or env vars.
# SECURITY: Never commit real PATs. Use GHCR_TOKEN in the environment or a local-only file.
# -----------------------------------------------------------------------------
$DefaultGhcrOwner = ""
$DefaultGhcrPat = ""
$DefaultGhcrLoginUser = ""

function Test-DockerRunning {
    # Docker prints warnings to stderr (e.g. DOCKER_INSECURE_NO_IPTABLES_RAW). In Windows
    # PowerShell 5.1, native stderr still becomes ErrorRecords under $ErrorActionPreference Stop
    # even with 2>$null. Run outside PS via cmd/sh so only $LASTEXITCODE matters.
    $onWindows = $false
    if ($PSVersionTable.PSVersion.Major -ge 6) {
        $onWindows = [bool]$IsWindows
    } else {
        $onWindows = $env:OS -like '*Windows*'
    }
    if ($onWindows) {
        cmd.exe /c "docker info >nul 2>nul"
    } elseif (Get-Command sh -ErrorAction SilentlyContinue) {
        sh -c 'docker info >/dev/null 2>&1'
    } else {
        # Last resort (unusual): suppress PS stderr handling for this call only
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'SilentlyContinue'
        try {
            docker info 1>$null 2>$null
        } finally {
            $ErrorActionPreference = $prev
        }
    }
    return ($LASTEXITCODE -eq 0)
}

function Get-ComposeArgs {
    param(
        [string]$ComposeFilePath,
        [string]$EnvFilePath
    )

    $args = @()
    if ($EnvFilePath -and $EnvFilePath.Trim()) {
        $args += @("--env-file", $EnvFilePath)
    }
    $args += @("-f", $ComposeFilePath)
    return $args
}

function Get-ComposeConfigJson {
    param(
        [string]$ComposeFilePath,
        [string]$EnvFilePath
    )

    $composeArgs = Get-ComposeArgs -ComposeFilePath $ComposeFilePath -EnvFilePath $EnvFilePath
    $json = docker compose @composeArgs config --format json 2>$null
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
        throw "GHCR owner not set. Pass -GhcrOwner, set `$DefaultGhcrOwner in this script, or set env var GHCR_OWNER."
    }
}

function Resolve-GhcrPat {
    param(
        [string]$FromParam,
        [string]$FromDefault
    )
    $p = ""
    if ($null -ne $FromParam) { $p = $FromParam.Trim() }
    if (-not $p -and $null -ne $env:GHCR_TOKEN) { $p = $env:GHCR_TOKEN.Trim() }
    if (-not $p -and $null -ne $env:GHCR_PAT) { $p = $env:GHCR_PAT.Trim() }
    if (-not $p -and $null -ne $FromDefault) { $p = $FromDefault.Trim() }
    return $p
}

function Resolve-GhcrLoginUser {
    param(
        [string]$FromParam,
        [string]$FromDefault,
        [string]$FallbackOwner
    )
    $u = ""
    if ($null -ne $FromParam) { $u = $FromParam.Trim() }
    if (-not $u -and $null -ne $env:GHCR_LOGIN_USER) { $u = $env:GHCR_LOGIN_USER.Trim() }
    if (-not $u -and $null -ne $FromDefault) { $u = $FromDefault.Trim() }
    if (-not $u -and $null -ne $FallbackOwner) { $u = $FallbackOwner.Trim() }
    return $u
}

function Invoke-GhcrDockerLogin {
    param(
        [Parameter(Mandatory = $true)][string]$Username,
        [Parameter(Mandatory = $true)][string]$Pat
    )
    $prevEa = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        # PAT via stdin; SilentlyContinue avoids PS 5.1 treating docker stderr as terminating.
        $Pat | docker login ghcr.io -u $Username --password-stdin 1>$null 2>$null
    } finally {
        $ErrorActionPreference = $prevEa
    }
    if ($LASTEXITCODE -ne 0) {
        throw "docker login ghcr.io failed for user '$Username'. Check PAT (write:packages) and username (use your GitHub user when pushing to an org namespace)."
    }
    Write-Host "Logged in to ghcr.io as $Username" -ForegroundColor Green
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

function Get-GhcrPushFailureMessage {
    param([Parameter(Mandatory = $true)][string]$ImageRef)
    $lines = @(
        "Failed to push: $ImageRef"
        ""
        "If the error was 403 Forbidden from ghcr.io, fix authentication and permissions:"
        "  1) docker login ghcr.io -u <your GitHub username>"
        "  2) Password = Personal Access Token (not your GitHub password). Scopes: write:packages and read:packages (classic PAT), or a fine-grained token with package write for the target owner."
        "  3) -GhcrOwner must match a user or org your account can publish to (e.g. your own user, or an org where you have package write / GitHub Actions package access)."
        "  4) If the org uses SAML SSO, authorize the PAT for that org in GitHub settings."
        "  5) First-time package: ensure the namespace allows you to create packages under it."
    ) -join [Environment]::NewLine
    return $lines
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
    if ($LASTEXITCODE -ne 0) {
        throw (Get-GhcrPushFailureMessage -ImageRef $targetVersion)
    }

    Write-Host "Pushing $targetLatest ..." -ForegroundColor Blue
    docker push $targetLatest
    if ($LASTEXITCODE -ne 0) {
        throw (Get-GhcrPushFailureMessage -ImageRef $targetLatest)
    }

    Write-Host "Pushed: $targetVersion, $targetLatest" -ForegroundColor Green
    return @($targetVersion, $targetLatest)
}

Write-Section "erpQ Compose → GHCR build & push"
Write-Host "Compose file: $ComposeFile" -ForegroundColor White
if ($EnvFile -and $EnvFile.Trim()) {
    Write-Host "Env file:     $EnvFile" -ForegroundColor White
}
Write-Host "Prefix:       $GhcrPrefix" -ForegroundColor White

if (-not (Test-Path -LiteralPath $ComposeFile)) {
    throw "Compose file not found: $ComposeFile (run from repo root or pass -ComposeFile)."
}
if ($EnvFile -and $EnvFile.Trim() -and -not (Test-Path -LiteralPath $EnvFile)) {
    throw "Env file not found: $EnvFile"
}

if (-not (Test-DockerRunning)) {
    $dockerHelp = @(
        "Docker is not running or the engine is not reachable (e.g. dockerDesktopLinuxEngine pipe missing)."
        ""
        "On Windows: start Docker Desktop and wait until it reports the engine is running, then run: docker info"
        ""
        "If you use the WSL2 backend, ensure WSL is updated and Docker Desktop integration is enabled."
    ) -join [Environment]::NewLine
    throw $dockerHelp
}

if (-not ($GhcrOwner -and $GhcrOwner.Trim())) {
    $GhcrOwner = $DefaultGhcrOwner
}

$GhcrOwner = Normalize-Owner $GhcrOwner
Ensure-GhcrOwner $GhcrOwner
Write-Host "GHCR owner:   $GhcrOwner" -ForegroundColor White

$resolvedPat = Resolve-GhcrPat -FromParam $GhcrPat -FromDefault $DefaultGhcrPat
$resolvedLoginUser = Resolve-GhcrLoginUser -FromParam $GhcrLoginUser -FromDefault $DefaultGhcrLoginUser -FallbackOwner $GhcrOwner

if ($resolvedPat) {
    Write-Host "GHCR login:   $resolvedLoginUser (via PAT from params/env/script default)" -ForegroundColor White
    Invoke-GhcrDockerLogin -Username $resolvedLoginUser -Pat $resolvedPat
} else {
    Write-Host ""
    Write-Host "No PAT provided (-GhcrPat / GHCR_TOKEN / `$DefaultGhcrPat). Run docker login ghcr.io manually before push or set a token." -ForegroundColor Yellow
}

if ($VersionFile) {
    Write-Host "Version file: $VersionFile" -ForegroundColor White
}
$Version = Get-NextVersion -ExplicitVersion $Version -VersionFilePath $VersionFile -BumpKind $Bump
Write-Host "Version tag:  $Version" -ForegroundColor White

Write-Host ""

if ($ComposeFile -match 'production') {
    Write-Host "Warning: production compose usually has no local builds; this run may only pull/mirror images." -ForegroundColor DarkYellow
}

$cfg = Get-ComposeConfigJson -ComposeFilePath $ComposeFile -EnvFilePath $EnvFile
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
        $composeArgs = Get-ComposeArgs -ComposeFilePath $ComposeFile -EnvFilePath $EnvFile
        docker compose @composeArgs build $svc
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
