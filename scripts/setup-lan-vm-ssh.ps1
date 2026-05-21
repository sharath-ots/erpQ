# One-time: install your SSH public key on the LAN VM so Docker context works without passwords.
# Usage (from repo root, PowerShell):
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup-lan-vm-ssh.ps1
#
# You will be asked for the VM password ONCE. After that:
#   ssh erpq-vm "echo ok"
#   powershell -ExecutionPolicy Bypass -File .\scripts\lan-deploy.ps1

$ErrorActionPreference = "Stop"

$VmHost = if ($env:ERPQ_VM_HOST) { $env:ERPQ_VM_HOST } else { "192.168.1.101" }
$VmUser = if ($env:ERPQ_VM_USER) { $env:ERPQ_VM_USER } else { "sharath" }
$SshDir = Join-Path $env:USERPROFILE ".ssh"
$KeyPath = Join-Path $SshDir "id_ed25519_erpq"
$PubPath = "$KeyPath.pub"
$ConfigPath = Join-Path $SshDir "config"

if (-not (Test-Path $PubPath)) {
    Write-Host "Creating SSH key at $KeyPath ..."
    New-Item -ItemType Directory -Force -Path $SshDir | Out-Null
    ssh-keygen -t ed25519 -C "erpq-dev-pc" -f $KeyPath -q -N '""'
}

# Ensure ~/.ssh/config on Windows (Docker + ssh use host alias erpq-vm)
$configBlock = @"
Host erpq-vm $VmHost
    HostName $VmHost
    User $VmUser
    IdentityFile $KeyPath
    IdentitiesOnly yes
    ServerAliveInterval 30
    ServerAliveCountMax 3

"@
if (-not (Test-Path $ConfigPath)) {
    [System.IO.File]::WriteAllText($ConfigPath, $configBlock.TrimEnd() + "`n")
} elseif (-not (Select-String -Path $ConfigPath -Pattern "Host erpq-vm" -Quiet)) {
    [System.IO.File]::AppendAllText($ConfigPath, "`n" + $configBlock)
}

$keyLine = (Get-Content $PubPath -First 1).Trim()
if (-not $keyLine) { throw "Public key file is empty: $PubPath" }

Write-Host "Installing public key on ${VmUser}@${VmHost} (enter VM password once) ..."
Write-Host ""

# Single-line remote commands only (avoids Windows CRLF breaking bash on the VM).
$sshTarget = "${VmUser}@${VmHost}"
$sshPwOpts = @(
    "-o", "PreferredAuthentications=password",
    "-o", "PubkeyAuthentication=no",
    "-o", "StrictHostKeyChecking=accept-new"
)

& ssh @sshPwOpts $sshTarget "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
if ($LASTEXITCODE -ne 0) { throw "SSH mkdir failed (exit $LASTEXITCODE)" }

# Append key only if missing (escape single quotes in key line for bash)
$escapedKey = $keyLine.Replace("'", "'\''")
& ssh @sshPwOpts $sshTarget "grep -qxF '$escapedKey' ~/.ssh/authorized_keys 2>/dev/null || echo '$escapedKey' >> ~/.ssh/authorized_keys"
if ($LASTEXITCODE -ne 0) { throw "SSH key install failed (exit $LASTEXITCODE)" }

Write-Host "Key installed on VM."
Write-Host ""
Write-Host "Testing passwordless login ..."

$sshKeyOpts = @(
    "-i", $KeyPath,
    "-o", "IdentitiesOnly=yes",
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=accept-new"
)
& ssh @sshKeyOpts "${VmUser}@${VmHost}" "echo SSH OK"
if ($LASTEXITCODE -ne 0) {
    throw @"
Passwordless SSH still failed.

On the VM, run:
  chmod 700 ~/.ssh
  chmod 600 ~/.ssh/authorized_keys
  cat ~/.ssh/authorized_keys

Then re-run this script.
"@
}

Write-Host ""
Write-Host "Recreating Docker context 'erpq-vm' ..."
$prevEa = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
docker context rm -f erpq-vm 2>&1 | Out-Null
$ErrorActionPreference = $prevEa

docker context create erpq-vm --docker "host=ssh://erpq-vm"
if ($LASTEXITCODE -ne 0) { throw "docker context create failed" }
docker context use erpq-vm
if ($LASTEXITCODE -ne 0) { throw "docker context use failed" }

Write-Host ""
Write-Host "Done. Deploy with:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\lan-deploy.ps1"
