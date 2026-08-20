[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $DeployRoot,
  # Nome confirmado da VM Ubuntu no host de produção. Mantido como parâmetro configurável (não
  # hardcode irreversível) para o caso de recriação/renome. O identificador real de host/IP de
  # produção não é versionado neste repositório (público) — configure localmente no host via
  # -DeployRoot/variável de ambiente própria da automação de deploy, fora deste script.
  [string] $VmName = 'UBU220405RUN',
  # Conta dona do registro da VM (VirtualBox.xml fica no perfil deste usuário, em
  # "%USERPROFILE%\.VirtualBox" ou "%USERPROFILE%\VirtualBox VMs"). NÃO existe um valor padrão
  # seguro aqui — ainda falta confirmar, no host de produção, qual conta Windows é dona da VM
  # (quem hoje abre o VirtualBox Manager e a enxerga). Preencha antes do primeiro
  # `Register-ScheduledTask` real; o script falha cedo (parâmetro obrigatório) se for esquecido.
  [Parameter(Mandatory = $true)] [string] $RunAsUser,
  [string] $VBoxManagePath = 'C:\Program Files\Oracle\VirtualBox\VBoxManage.exe',
  [string] $TaskName = 'VirtualBox-Autostart',
  # S4U inicia a task no boot SEM exigir senha armazenada nem logon interativo prévio do usuário
  # (diferente de LogonType Password). Login de rede fica limitado (o token S4U não carrega
  # credenciais de domínio para recursos remotos), mas VBoxManage é 100% local, então não há
  # perda funcional aqui. Ver "Task Scheduler S4U logon" na documentação da Microsoft.
  [ValidateSet('S4U', 'Password')]
  [string] $LogonType = 'S4U',
  [System.Security.SecureString] $Password,
  [switch] $Force
)

# ---------------------------------------------------------------------------
# Sobe a VM Ubuntu do VirtualBox automaticamente no boot do host Windows, headless
# (sem precisar de sessão gráfica), via `VBoxManage startvm <VmName> --type headless`.
#
# Por que o principal NÃO é SYSTEM por padrão:
#   Desde a VirtualBox 6.0, o instalador Windows registra o serviço `VBoxSDS`, que permite
#   iniciar VMs sem nenhum usuário logado interativamente — então tecnicamente uma Scheduled
#   Task como SYSTEM consegue *iniciar* o processo VBoxHeadless. O problema é outro: o registro
#   das VMs (VirtualBox.xml, e por padrão as pastas de VM) fica no perfil do usuário que criou/
#   importou a VM, não em um local compartilhado do sistema. Rodar como SYSTEM faz o VBoxManage
#   olhar para o perfil (inexistente) do SYSTEM e falhar com "machine not found", mesmo com o
#   VBoxSDS ativo. Por isso este script exige `-RunAsUser` explícito (o dono real da VM) em vez
#   de assumir SYSTEM. Se a VM for registrada de forma multiusuário/sistema neste host, ajuste
#   `-RunAsUser` para a conta apropriada mesmo assim — este script não tenta adivinhar.
#
# Padrão idêntico ao `Register-CloudflareTunnel.ps1`: idempotente, `-Force` recria a task,
# log dedicado com rotação simples em logs/virtualbox-autostart.log.
# ---------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function ConvertTo-PowerShellLiteral([string] $Value) {
  return "'" + $Value.Replace("'", "''") + "'"
}

if ($LogonType -eq 'Password' -and -not $Password) {
  throw "LogonType 'Password' exige -Password (SecureString). Alternativa sem senha " +
    "armazenada: use -LogonType S4U (padrão)."
}

if (-not (Test-Path -LiteralPath $VBoxManagePath -PathType Leaf)) {
  throw "VBoxManage.exe não encontrado em '$VBoxManagePath'. Ajuste -VBoxManagePath se o " +
    "VirtualBox estiver instalado em outro caminho neste host."
}

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask -and -not $Force) {
  Write-Host "A task '$TaskName' já existe; nada a fazer. Use -Force para recriar " `
    "(ex.: trocar -VmName, -RunAsUser ou -LogonType)."
  return
}
if ($existingTask -and $Force) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$deployPath = [System.IO.Path]::GetFullPath($DeployRoot.Trim('"', "'", ' '))
$logsRoot = Join-Path $deployPath 'logs'
New-Item -ItemType Directory -Path $deployPath, $logsRoot -Force | Out-Null

$logFile = Join-Path $logsRoot 'virtualbox-autostart.log'
$logFileRotated = Join-Path $logsRoot 'virtualbox-autostart.log.old'

$launcherPath = Join-Path $deployPath 'Start-VirtualBoxVm.ps1'
$launcher = @(
  "`$ErrorActionPreference = 'Stop'",
  '# Rotação simples, mesmo padrão dos demais launchers: guarda uma única cópia anterior (.old).',
  "`$logFile = $(ConvertTo-PowerShellLiteral $logFile)",
  "`$logFileRotated = $(ConvertTo-PowerShellLiteral $logFileRotated)",
  '$maxLogBytes = 20MB',
  'if ((Test-Path -LiteralPath $logFile) -and (Get-Item -LiteralPath $logFile).Length -gt $maxLogBytes) {',
  '  Move-Item -LiteralPath $logFile -Destination $logFileRotated -Force',
  '}',
  '# Scheduled Tasks não têm console; redirecionar via cmd.exe funciona sem console.',
  "`$vboxManageExe = $(ConvertTo-PowerShellLiteral $VBoxManagePath)",
  "`$vmName = $(ConvertTo-PowerShellLiteral $VmName)",
  '$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"',
  'Add-Content -LiteralPath $logFile -Value "[$timestamp] Iniciando VM `"$vmName`" (headless)..."',
  '$vboxArgs = "startvm `"" + $vmName + "`" --type headless"',
  '$cmdLine = "`"" + $vboxManageExe + "`" " + $vboxArgs + " >> `"" + $logFile + "`" 2>&1"',
  '& cmd.exe /c $cmdLine',
  '$exitCode = $LASTEXITCODE',
  'Add-Content -LiteralPath $logFile -Value "[$timestamp] VBoxManage saiu com código $exitCode " +',
  '  "(0 = iniciada com sucesso; 1 = já estava rodando ou outro erro — ver linhas acima)."',
  'exit 0'
)
Set-Content -LiteralPath $launcherPath -Value $launcher -Encoding UTF8

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$launcherPath`""

if ($LogonType -eq 'S4U') {
  $principal = New-ScheduledTaskPrincipal -UserId $RunAsUser -LogonType S4U -RunLevel Highest
} else {
  $principal = New-ScheduledTaskPrincipal -UserId $RunAsUser -LogonType Password -RunLevel Highest
}

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

# Pequeno atraso após o boot: a VM depende do serviço VBoxSDS e (dependendo do host) de discos/
# rede já montados; iniciar exatamente em -AtStartup às vezes corre com o próprio boot do
# VirtualBox. 30s é suficiente na prática do host de produção — ajuste se necessário.
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = 'PT30S'

if ($LogonType -eq 'Password') {
  $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($Password)
  )
  try {
    Register-ScheduledTask `
      -TaskName $TaskName `
      -Action $action `
      -Principal $principal `
      -Settings $settings `
      -Trigger $trigger `
      -User $RunAsUser `
      -Password $plainPassword | Out-Null
  } finally {
    # Não deixa a senha em texto plano residir na memória do processo além do necessário.
    Remove-Variable -Name plainPassword -ErrorAction SilentlyContinue
  }
} else {
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Principal $principal `
    -Settings $settings `
    -Trigger $trigger | Out-Null
}

Write-Host "Task '$TaskName' criada (LogonType=$LogonType, RunAsUser=$RunAsUser)."
Write-Host "Ela só dispara no próximo boot (trigger -AtStartup); para validar agora, rode:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "e confira o log em: $logFile"
Write-Host ''
Write-Host 'IMPORTANTE: se este for o primeiro registro, valide manualmente (VBoxManage list' `
  'runningvms) após um boot real antes de considerar resolvido — LogonType S4U tem' `
  'comportamento que pode variar entre hosts com política de grupo restritiva.'
