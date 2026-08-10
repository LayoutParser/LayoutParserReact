[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$arrDownloadUrl = 'https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi'
$arrSha256 = 'FB61FDB7101795A34D5129CB37EEE43AB675C7ED76BA3A3B23B039D8C90C2A4B'

function Test-IsAdministrator {
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [System.Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-GlobalIisModule([string] $Name) {
  Import-Module WebAdministration -Force -ErrorAction Stop
  return $null -ne (Get-WebGlobalModule -Name $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-IsAdministrator)) {
  throw 'A instalação do ARR exige execução como administrador ou pelo runner LocalSystem.'
}

if (Test-GlobalIisModule -Name 'ApplicationRequestRouting') {
  Write-Host 'IIS Application Request Routing (ARR) já está instalado.'
  exit 0
}

if (-not (Test-GlobalIisModule -Name 'RewriteModule')) {
  throw 'ARR depende do IIS URL Rewrite, que precisa ser instalado primeiro.'
}

$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$workingRoot = [System.IO.Path]::GetFullPath(
  (Join-Path $tempRoot "layoutparser-arr-$([guid]::NewGuid().ToString('N'))")
)
$expectedPrefix = $tempRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) +
  [System.IO.Path]::DirectorySeparatorChar

if (-not $workingRoot.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Diretório temporário do ARR fora da raiz esperada: $workingRoot"
}

$installerPath = Join-Path $workingRoot 'requestRouter_amd64.msi'
$logPath = Join-Path $workingRoot 'requestRouter-install.log'

try {
  New-Item -ItemType Directory -Path $workingRoot | Out-Null
  Write-Host 'Baixando o instalador oficial do ARR 3 para x64...'
  Invoke-WebRequest -Uri $arrDownloadUrl -OutFile $installerPath

  $actualHash = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash
  if ($actualHash -ne $arrSha256) {
    throw "SHA-256 inesperado para o instalador do ARR: $actualHash"
  }

  $signature = Get-AuthenticodeSignature -LiteralPath $installerPath
  $signerSubject = if ($signature.SignerCertificate) {
    $signature.SignerCertificate.Subject
  } else {
    ''
  }
  if (
    $signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid -or
    $signerSubject -notmatch '(?i)(^|,\s*)O=Microsoft Corporation(,|$)'
  ) {
    throw "Assinatura Authenticode inválida para o instalador do ARR: $($signature.Status)"
  }

  $arguments = "/i `"$installerPath`" /qn /norestart /L*v `"$logPath`""
  $process = Start-Process `
    -FilePath (Join-Path $env:windir 'System32\msiexec.exe') `
    -ArgumentList $arguments `
    -Wait `
    -PassThru `
    -WindowStyle Hidden

  if ($process.ExitCode -notin @(0, 3010)) {
    if (Test-Path -LiteralPath $logPath) {
      Get-Content -LiteralPath $logPath -Tail 80 | Write-Host
    }
    throw "A instalação silenciosa do ARR falhou com o código $($process.ExitCode)."
  }

  if ($process.ExitCode -eq 3010) {
    Write-Warning 'O instalador do ARR solicitou reinicialização do Windows.'
  }

  if (-not (Test-GlobalIisModule -Name 'ApplicationRequestRouting')) {
    throw 'O MSI foi concluído, mas o módulo ApplicationRequestRouting não foi registrado no IIS.'
  }

  Write-Host 'IIS Application Request Routing (ARR) 3 instalado e validado.'
} finally {
  if (
    (Test-Path -LiteralPath $workingRoot) -and
    $workingRoot.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase) -and
    ([System.IO.Path]::GetFileName($workingRoot) -like 'layoutparser-arr-*')
  ) {
    Remove-Item -LiteralPath $workingRoot -Recurse -Force
  }
}
