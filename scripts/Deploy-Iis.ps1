[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $DeployRoot,
  [Parameter(Mandatory = $true)] [string] $SiteName,
  [Parameter(Mandatory = $true)] [string] $PublicHost,
  [Parameter(Mandatory = $true)] [string] $UpstreamUrl,
  [Parameter(Mandatory = $true)] [string] $AdminUsers,
  [string] $AdminRoles = '',
  [string] $TrustedProxyIps = '127.0.0.1',
  [string] $FrontendSource = 'dist',
  [string] $ServerSource = 'server',
  [int] $BffPort = 3100,
  [int] $KeepReleases = 5
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-SafeDeployRoot([string] $Candidate) {
  $fullPath = [System.IO.Path]::GetFullPath($Candidate.Trim('"', "'", ' '))
  $pathRoot = [System.IO.Path]::GetPathRoot($fullPath)
  $windowsRoot = [System.IO.Path]::GetFullPath($env:windir)
  $workspaceRoot = [System.IO.Path]::GetFullPath($PWD.Path)

  if (
    $fullPath -eq $pathRoot -or
    $fullPath -eq $windowsRoot -or
    $fullPath -eq $workspaceRoot -or
    $fullPath.Length -lt 10
  ) {
    throw "DEPLOY_PATH inseguro ou amplo demais: $fullPath"
  }

  return $fullPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar)
}

function ConvertTo-PowerShellLiteral([string] $Value) {
  return "'" + $Value.Replace("'", "''") + "'"
}

function Register-BffTask([string] $LauncherPath, [string] $TaskName) {
  $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existingTask) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }

  $action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$LauncherPath`""
  $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1)
  $trigger = New-ScheduledTaskTrigger -AtStartup

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Principal $principal `
    -Settings $settings `
    -Trigger $trigger | Out-Null
}

function Wait-BffHealth([int] $Port) {
  $healthUrl = "http://127.0.0.1:$Port/health"
  for ($attempt = 1; $attempt -le 15; $attempt++) {
    try {
      $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
      if ($health.status -eq 'ok' -and $health.service -eq 'layout-parser-bff') {
        return
      }
    } catch {
      if ($attempt -eq 15) { throw }
    }
    Start-Sleep -Seconds 2
  }

  throw "O BFF não ficou saudável em $healthUrl."
}

if ($SiteName -notmatch '^[A-Za-z0-9._-]{1,64}$') {
  throw 'IIS_SITE_NAME deve conter apenas letras, números, ponto, hífen ou underscore.'
}
if ($PublicHost -notmatch '^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$') {
  throw 'PUBLIC_HOST deve ser somente um hostname DNS, sem protocolo, caminho ou porta.'
}
if ([string]::IsNullOrWhiteSpace($AdminUsers) -and [string]::IsNullOrWhiteSpace($AdminRoles)) {
  throw 'Configure BFF_ADMIN_USERS e/ou BFF_ADMIN_ROLES no environment do GitHub.'
}
if ($BffPort -lt 1 -or $BffPort -gt 65535) { throw 'BFF_PORT inválida.' }
if ($KeepReleases -lt 2 -or $KeepReleases -gt 20) { throw 'KEEP_RELEASES deve estar entre 2 e 20.' }

$deployPath = Resolve-SafeDeployRoot $DeployRoot
$frontendSourcePath = (Resolve-Path -LiteralPath $FrontendSource).Path
$serverSourcePath = (Resolve-Path -LiteralPath $ServerSource).Path
if (-not (Test-Path -LiteralPath (Join-Path $frontendSourcePath 'index.html') -PathType Leaf)) {
  throw 'O build do front não contém dist/index.html.'
}
if (-not (Test-Path -LiteralPath (Join-Path $serverSourcePath 'dist/src/index.js') -PathType Leaf)) {
  throw 'O build do BFF não contém server/dist/src/index.js.'
}

Import-Module WebAdministration -ErrorAction Stop
if (-not (Get-PSDrive -Name 'IIS' -ErrorAction SilentlyContinue)) {
  throw 'O provider IIS não está disponível. Execute o deploy com o Windows PowerShell (powershell.exe).'
}
if (-not (Get-WebGlobalModule -Name 'RewriteModule' -ErrorAction SilentlyContinue)) {
  throw 'IIS URL Rewrite não está instalado.'
}
if (-not (Get-WebGlobalModule -Name 'ApplicationRequestRouting' -ErrorAction SilentlyContinue)) {
  throw 'IIS Application Request Routing (ARR) não está instalado.'
}
Set-WebConfigurationProperty `
  -PSPath 'MACHINE/WEBROOT/APPHOST' `
  -Filter 'system.webServer/proxy' `
  -Name 'enabled' `
  -Value $true

$appCmd = Join-Path $env:windir 'System32\inetsrv\appcmd.exe'
$allowedVariables = & $appCmd list config -section:system.webServer/rewrite/allowedServerVariables
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar as server variables do URL Rewrite.' }
if (($allowedVariables | Out-String) -notmatch 'HTTP_X_IIS_USER') {
  & $appCmd set config -section:system.webServer/rewrite/allowedServerVariables "/+[name='HTTP_X_IIS_USER']" /commit:apphost
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível autorizar HTTP_X_IIS_USER no URL Rewrite.' }
}
$website = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if (-not $website) { throw "O site IIS '$SiteName' precisa ser provisionado antes do deploy." }
$httpsBinding = Get-WebBinding -Name $SiteName -Protocol 'https' -ErrorAction SilentlyContinue
if (-not $httpsBinding) { throw "O site IIS '$SiteName' não possui binding HTTPS." }
$httpBinding = Get-WebBinding -Name $SiteName -Protocol 'http' -ErrorAction SilentlyContinue
if ($httpBinding) { throw "O site IIS '$SiteName' ainda expõe binding HTTP; mantenha apenas HTTPS." }

$releasesRoot = Join-Path $deployPath 'releases'
$runtimeRoot = Join-Path $deployPath 'runtime'
$stateRoot = Join-Path $deployPath 'state'
foreach ($directory in @($deployPath, $releasesRoot, $runtimeRoot, $stateRoot)) {
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
}

$sha = if ($env:GITHUB_SHA) { $env:GITHUB_SHA.Substring(0, 12) } else { 'manual' }
$releaseName = "$(Get-Date -Format 'yyyyMMdd-HHmmss')-$sha"
$releaseRoot = Join-Path $releasesRoot $releaseName
$frontendTarget = Join-Path $releaseRoot 'front-end'
$serverTarget = Join-Path $releaseRoot 'server'
New-Item -ItemType Directory -Path $frontendTarget, $serverTarget -Force | Out-Null

Copy-Item -Path (Join-Path $frontendSourcePath '*') -Destination $frontendTarget -Recurse -Force
Copy-Item -LiteralPath (Join-Path $serverSourcePath 'dist') -Destination $serverTarget -Recurse -Force
Copy-Item -LiteralPath (Join-Path $serverSourcePath 'package.json') -Destination $serverTarget -Force
Copy-Item -LiteralPath (Join-Path $serverSourcePath 'package-lock.json') -Destination $serverTarget -Force

npm ci --omit=dev --ignore-scripts --prefix $serverTarget
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependências de produção do BFF.' }

$nodeSource = (Get-Command node.exe -ErrorAction Stop).Source
$nodeTarget = Join-Path $runtimeRoot 'node.exe'
Copy-Item -LiteralPath $nodeSource -Destination $nodeTarget -Force

$launcherPath = Join-Path $releaseRoot 'Start-Bff.ps1'
$launcher = @(
  "`$ErrorActionPreference = 'Stop'",
  "`$env:NODE_ENV = 'production'",
  "`$env:BFF_HOST = '127.0.0.1'",
  "`$env:BFF_PORT = $(ConvertTo-PowerShellLiteral $BffPort.ToString())",
  "`$env:LAYOUTPARSER_API_URL = $(ConvertTo-PowerShellLiteral $UpstreamUrl)",
  "`$env:BFF_TRUSTED_PROXY_IPS = $(ConvertTo-PowerShellLiteral $TrustedProxyIps)",
  "`$env:BFF_TRUSTED_USER_HEADER = 'x-iis-user'",
  "`$env:BFF_TRUSTED_ROLES_HEADER = 'x-iis-roles'",
  "`$env:BFF_ADMIN_USERS = $(ConvertTo-PowerShellLiteral $AdminUsers)",
  "`$env:BFF_ADMIN_ROLES = $(ConvertTo-PowerShellLiteral $AdminRoles)",
  "`$env:BFF_DEV_AUTH_ENABLED = 'false'",
  "Set-Location -LiteralPath $(ConvertTo-PowerShellLiteral $serverTarget)",
  "& $(ConvertTo-PowerShellLiteral $nodeTarget) $(ConvertTo-PowerShellLiteral (Join-Path $serverTarget 'dist/src/index.js'))",
  'exit $LASTEXITCODE'
)
Set-Content -LiteralPath $launcherPath -Value $launcher -Encoding UTF8
$launcherAcl = [System.Security.AccessControl.FileSecurity]::new()
$launcherAcl.SetAccessRuleProtection($true, $false)
foreach ($sidValue in @('S-1-5-18', 'S-1-5-32-544')) {
  $sid = [System.Security.Principal.SecurityIdentifier]::new($sidValue)
  $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
    $sid,
    [System.Security.AccessControl.FileSystemRights]::FullControl,
    [System.Security.AccessControl.AccessControlType]::Allow
  )
  $launcherAcl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $launcherPath -AclObject $launcherAcl

$taskName = "$SiteName-BFF"
$stateFile = Join-Path $stateRoot 'current.json'
$previousState = if (Test-Path -LiteralPath $stateFile) {
  Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
} else { $null }
$previousPhysicalPath = (Get-ItemProperty "IIS:\Sites\$SiteName").physicalPath

try {
  Register-BffTask -LauncherPath $launcherPath -TaskName $taskName
  Start-ScheduledTask -TaskName $taskName
  Wait-BffHealth -Port $BffPort

  Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $frontendTarget
  Restart-WebItem "IIS:\Sites\$SiteName"

  $matchingBinding = @($httpsBinding) | Where-Object {
    $parts = $_.bindingInformation.Split(':')
    $bindingHost = if ($parts.Count -ge 3) { $parts[2] } else { '' }
    -not $bindingHost -or $bindingHost -eq $PublicHost
  } | Select-Object -First 1
  if (-not $matchingBinding) {
    throw "O site IIS '$SiteName' não possui binding HTTPS compatível com PUBLIC_HOST '$PublicHost'."
  }

  $binding = $matchingBinding.bindingInformation.Split(':')
  $httpsPort = if ($binding.Count -ge 2 -and $binding[1]) { $binding[1] } else { '443' }
  $smokeUrl = "https://$PublicHost`:$httpsPort/"
  $response = Invoke-WebRequest -Uri $smokeUrl -UseDefaultCredentials -TimeoutSec 15
  if ($response.StatusCode -ne 200) { throw "Smoke test retornou HTTP $($response.StatusCode)." }

  [pscustomobject]@{
    release = $releaseName
    frontendPath = $frontendTarget
    serverPath = $serverTarget
    launcherPath = $launcherPath
    deployedAtUtc = [DateTime]::UtcNow.ToString('O')
  } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
} catch {
  Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $previousPhysicalPath
  Restart-WebItem "IIS:\Sites\$SiteName" -ErrorAction SilentlyContinue
  if ($previousState -and (Test-Path -LiteralPath $previousState.launcherPath)) {
    Register-BffTask -LauncherPath $previousState.launcherPath -TaskName $taskName
    Start-ScheduledTask -TaskName $taskName
  }
  throw
}

$oldReleases = Get-ChildItem -LiteralPath $releasesRoot -Directory |
  Sort-Object Name -Descending |
  Select-Object -Skip $KeepReleases
foreach ($oldRelease in $oldReleases) {
  $resolvedOldRelease = [System.IO.Path]::GetFullPath($oldRelease.FullName)
  $resolvedReleasesRoot = [System.IO.Path]::GetFullPath($releasesRoot) + [System.IO.Path]::DirectorySeparatorChar
  if (-not $resolvedOldRelease.StartsWith($resolvedReleasesRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Release fora da raiz esperada: $resolvedOldRelease"
  }
  Remove-Item -LiteralPath $resolvedOldRelease -Recurse -Force
}

Write-Host "Deploy concluído: release $releaseName, front HTTPS e BFF saudável."
