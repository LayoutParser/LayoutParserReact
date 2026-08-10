[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $SiteName,
  [Parameter(Mandatory = $true)] [string] $PublicHost,
  [int] $HttpsPort = 443,
  [int] $MinimumCertificateValidityDays = 30
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Test-IsAdministrator {
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object System.Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-BindingParts($Binding) {
  $parts = $Binding.bindingInformation.Split(':')
  if ($parts.Count -lt 3) {
    throw "Binding IIS inválido: $($Binding.bindingInformation)"
  }

  return [pscustomobject]@{
    IpAddress = $parts[0]
    Port = [int] $parts[1]
    HostHeader = $parts[2]
  }
}

function Test-CertificateHost($Certificate, [string] $HostName) {
  $dnsName = $Certificate.GetNameInfo(
    [System.Security.Cryptography.X509Certificates.X509NameType]::DnsName,
    $false
  )
  if ($dnsName.Equals($HostName, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $true
  }

  $escapedHost = [regex]::Escape($HostName)
  return $Certificate.Subject -match "(?i)(?:^|,\s*)CN=$escapedHost(?:,|$)"
}

if (-not (Test-IsAdministrator)) {
  throw 'A configuração HTTPS do IIS exige execução como administrador ou pelo runner LocalSystem.'
}
if ($SiteName -notmatch '^[A-Za-z0-9._-]{1,64}$') {
  throw 'IIS_SITE_NAME deve conter apenas letras, números, ponto, hífen ou underscore.'
}
if ($PublicHost -notmatch '^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$') {
  throw 'PUBLIC_HOST deve ser somente um hostname DNS, sem protocolo, caminho ou porta.'
}
if ($HttpsPort -lt 1 -or $HttpsPort -gt 65535) { throw 'HTTPS_PORT inválida.' }
if ($MinimumCertificateValidityDays -lt 1 -or $MinimumCertificateValidityDays -gt 365) {
  throw 'MINIMUM_CERTIFICATE_VALIDITY_DAYS deve estar entre 1 e 365.'
}

Import-Module WebAdministration -ErrorAction Stop

$website = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if (-not $website) {
  throw "O site IIS '$SiteName' precisa existir antes da configuração HTTPS."
}

foreach ($otherWebsite in @(Get-Website | Where-Object { $_.Name -ne $SiteName })) {
  foreach ($binding in @(Get-WebBinding -Name $otherWebsite.Name -Protocol 'https')) {
    $bindingParts = Get-BindingParts $binding
    if ($bindingParts.Port -eq $HttpsPort) {
      throw "A porta HTTPS $HttpsPort já é usada pelo site IIS '$($otherWebsite.Name)'."
    }
  }
}

$now = Get-Date
$minimumExpiry = $now.AddDays($MinimumCertificateValidityDays)
$certificate = Get-ChildItem Cert:\LocalMachine\My |
  Where-Object {
    $_.HasPrivateKey -and
    $_.NotBefore -le $now -and
    $_.NotAfter -gt $minimumExpiry -and
    (Test-CertificateHost $_ $PublicHost)
  } |
  Sort-Object NotAfter -Descending |
  Select-Object -First 1

if (-not $certificate) {
  throw "Nenhum certificado válido com chave privada para '$PublicHost' foi encontrado em Cert:\LocalMachine\My."
}

$httpsBindings = @(Get-WebBinding -Name $SiteName -Protocol 'https')
$compatibleBinding = $httpsBindings | Where-Object {
  $parts = Get-BindingParts $_
  $parts.Port -eq $HttpsPort -and
  [string]::IsNullOrWhiteSpace($parts.HostHeader)
} | Select-Object -First 1

$createdHttpsBinding = $false
if (-not $compatibleBinding) {
  New-WebBinding `
    -Name $SiteName `
    -Protocol 'https' `
    -IPAddress '*' `
    -Port $HttpsPort `
    -HostHeader '' `
    -SslFlags 0 | Out-Null
  $createdHttpsBinding = $true
}

try {
  $verifiedHttpsBinding = @(Get-WebBinding -Name $SiteName -Protocol 'https') | Where-Object {
    $parts = Get-BindingParts $_
    $parts.Port -eq $HttpsPort -and
    [string]::IsNullOrWhiteSpace($parts.HostHeader)
  } | Select-Object -First 1
  if (-not $verifiedHttpsBinding) {
    throw "Não foi possível criar o binding HTTPS na porta $HttpsPort para '$SiteName'."
  }

  $verifiedHttpsBinding.AddSslCertificate($certificate.Thumbprint, 'My')
} catch {
  if ($createdHttpsBinding) {
    Remove-WebBinding `
      -Name $SiteName `
      -Protocol 'https' `
      -IPAddress '*' `
      -Port $HttpsPort `
      -HostHeader '' `
      -ErrorAction SilentlyContinue
  }
  throw
}

foreach ($httpBinding in @(Get-WebBinding -Name $SiteName -Protocol 'http')) {
  $bindingParts = Get-BindingParts $httpBinding
  Remove-WebBinding `
    -Name $SiteName `
    -Protocol 'http' `
    -IPAddress $bindingParts.IpAddress `
    -Port $bindingParts.Port `
    -HostHeader $bindingParts.HostHeader
}

if (Get-WebBinding -Name $SiteName -Protocol 'http' -ErrorAction SilentlyContinue) {
  throw "O site IIS '$SiteName' ainda possui binding HTTP após a migração."
}

Restart-WebItem "IIS:\Sites\$SiteName"
Write-Host "HTTPS configurado em https://$PublicHost`:$HttpsPort/ com o certificado $($certificate.Thumbprint)."
