[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $DeployRoot,
  [Parameter(Mandatory = $true)] [string] $PublicHost,
  [string] $CloudflaredPath = 'C:\Program Files (x86)\cloudflared\cloudflared.exe',
  [string] $TaskName = 'Cloudflared-QuickTunnel',
  [switch] $Force
)

# ---------------------------------------------------------------------------
# TEMPORÁRIO / VALIDAÇÃO INTERNA — Cloudflare Quick Tunnel
#
# Este script registra `cloudflared tunnel --url ...` como Scheduled Task própria,
# independente da task do BFF ("$SiteName-BFF"), para publicar o IIS local (HTTPS)
# em um hostname público *.trycloudflare.com. Isso existe porque hoje não há
# domínio próprio comprado: login OIDC (Google/Entra) exige um redirect URI com
# host público válido, e um IP puro não é aceito pelo Google.
#
# Limitações conhecidas do Quick Tunnel gratuito (não são bugs deste script):
#   - A URL é aleatória e só aparece nas primeiras linhas do log do cloudflared
#     quando o PROCESSO cloudflared inicia (não a cada deploy do BFF, mas sim a
#     cada vez que a task do túnel reinicia o cloudflared.exe).
#   - Não há como fixar a URL sem migrar para um Named Tunnel com domínio próprio.
#
# Migração futura: comprar um domínio e configurar um Named Tunnel elimina essa
# instabilidade (URL fixa, sem necessidade de recapturar do log). Quando isso
# acontecer, este script pode ser removido/substituído.
# ---------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function ConvertTo-PowerShellLiteral([string] $Value) {
  return "'" + $Value.Replace("'", "''") + "'"
}

if (-not (Test-Path -LiteralPath $CloudflaredPath -PathType Leaf)) {
  throw "cloudflared.exe não encontrado em '$CloudflaredPath'. Instale a partir de " +
    "https://github.com/cloudflare/cloudflared/releases (ou ajuste -CloudflaredPath se o " +
    "binário estiver em outro caminho neste host)."
}

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask -and -not $Force) {
  Write-Host "A task '$TaskName' já existe; nada a fazer. A URL pública permanece a mesma " `
    "entre deploys normais do BFF. Use -Force para recriar a task e gerar uma nova URL " `
    "(ex.: se o processo cloudflared travou ou você precisa trocar de PublicHost)."
  return
}
if ($existingTask -and $Force) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$deployPath = [System.IO.Path]::GetFullPath($DeployRoot.Trim('"', "'", ' '))
$logsRoot = Join-Path $deployPath 'logs'
New-Item -ItemType Directory -Path $deployPath, $logsRoot -Force | Out-Null

$logFile = Join-Path $logsRoot 'cloudflared-tunnel.log'
$logFileRotated = Join-Path $logsRoot 'cloudflared-tunnel.log.old'

$launcherPath = Join-Path $deployPath 'Start-CloudflareTunnel.ps1'
$launcher = @(
  "`$ErrorActionPreference = 'Stop'",
  '# Rotação simples, mesmo padrão do log do BFF: guarda uma única cópia anterior (.old).',
  "`$logFile = $(ConvertTo-PowerShellLiteral $logFile)",
  "`$logFileRotated = $(ConvertTo-PowerShellLiteral $logFileRotated)",
  '$maxLogBytes = 20MB',
  'if ((Test-Path -LiteralPath $logFile) -and (Get-Item -LiteralPath $logFile).Length -gt $maxLogBytes) {',
  '  Move-Item -LiteralPath $logFile -Destination $logFileRotated -Force',
  '}',
  '# Scheduled Tasks não têm console; redirecionar via cmd.exe funciona sem console e',
  '# preserva a saída do cloudflared (é nela que a URL *.trycloudflare.com aparece). O cloudflared',
  '# já emite timestamp próprio em cada linha, mas gravamos também um marcador nosso de início',
  '# (com o motivo do disparo: boot ou RestartCount do Task Scheduler) para reconstruir a timeline',
  '# de uma falha sem precisar cruzar formatos de log diferentes.',
  '$startTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"',
  "`$cloudflaredExe = $(ConvertTo-PowerShellLiteral $CloudflaredPath)",
  "`$publicHost = $(ConvertTo-PowerShellLiteral $PublicHost)",
  '# --edge-ip-version 4: neste host, resolução de edge via IPv6 trava até timeout no POST' +
    ' inicial de "Requesting new quick Tunnel" (rota IPv6 de saída indisponível/bloqueada);' +
    ' IPv4 funciona normalmente. Ver diagnóstico em' +
    ' project_cloudflare_tunnel_task_never_registered_2026_08_22.md.',
  '$cloudflaredArgs = "tunnel --url https://127.0.0.1:443 --protocol http2 --no-tls-verify " +' +
    '"--edge-ip-version 4 --origin-server-name `"" + $publicHost + "`" --http-host-header `"" + $publicHost + "`""',
  '$cmdLine = "`"" + $cloudflaredExe + "`" " + $cloudflaredArgs + " >> `"" + $logFile + "`" 2>&1"',
  'Add-Content -LiteralPath $logFile -Value "[$startTimestamp] --- launcher iniciando cloudflared ' +
    '(boot da task ou reinício automático via RestartCount) ---"',
  '& cmd.exe /c $cmdLine',
  '$exitCode = $LASTEXITCODE',
  '$endTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"',
  'Add-Content -LiteralPath $logFile -Value "[$endTimestamp] --- cloudflared encerrou com código ' +
    '$exitCode; Task Scheduler deve reiniciar automaticamente (RestartCount/RestartInterval) ---"',
  'exit $exitCode'
)
Set-Content -LiteralPath $launcherPath -Value $launcher -Encoding UTF8

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$launcherPath`""
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1)
$trigger = New-ScheduledTaskTrigger -AtStartup

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Principal $principal `
  -Settings $settings `
  -Trigger $trigger | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "Task '$TaskName' criada e iniciada."
Write-Host "Aguardando o cloudflared publicar a URL pública no log ($logFile)..."
Start-Sleep -Seconds 8

if (Test-Path -LiteralPath $logFile) {
  # O log é append-only entre reinícios/execuções; "api.trycloudflare.com" é o endpoint da
  # API do Cloudflare (usado internamente pelo cloudflared para requisitar o túnel), não a
  # URL pública — precisa ser excluído do match, senão uma tentativa antiga/falha nas
  # primeiras linhas do arquivo é capturada em vez da URL real. Também restringimos a busca
  # às linhas a partir do ÚLTIMO marcador "--- launcher iniciando cloudflared ---" e pegamos
  # o match mais recente (Select-Object -Last 1), para refletir a execução atual do processo.
  $allLines = Get-Content -LiteralPath $logFile
  $lastStartIndex = ($allLines | Select-String -Pattern '--- launcher iniciando cloudflared ---' |
    Select-Object -Last 1).LineNumber
  $relevantLines = if ($lastStartIndex) { $allLines[($lastStartIndex - 1)..($allLines.Count - 1)] } else { $allLines }
  $urlMatch = $relevantLines |
    Select-String -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' |
    Where-Object { $_.Matches[0].Value -ne 'https://api.trycloudflare.com' } |
    Select-Object -Last 1
  if ($urlMatch) {
    Write-Host "URL pública do túnel: $($urlMatch.Matches[0].Value)"
    Write-Host 'Cadastre essa URL como BFF_PUBLIC_ORIGIN / vars.PUBLIC_HOST e nos redirect URIs' `
      'do Google/Azure. Ela some do log após rotação — se precisar recuperá-la depois, rode' `
      'este script novamente com -Force (isso gera uma URL NOVA, então reatualize os cadastros).'
  } else {
    Write-Host "A URL ainda não apareceu no log. Verifique manualmente em: $logFile"
  }
} else {
  Write-Host "Log ainda não foi criado; verifique o Task Scheduler e tente novamente em instantes."
}
