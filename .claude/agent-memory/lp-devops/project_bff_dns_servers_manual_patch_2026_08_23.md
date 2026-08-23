---
name: project_bff_dns_servers_manual_patch_2026_08_23
description: Patch manual e temporário de BFF_DNS_SERVERS no Start-Bff.ps1 do release ativo, montado em 2026-08-23 para corrigir login lento/flaky por DNS multi-homed em produção.
metadata:
  type: project
---

Em 2026-08-23, o PR #153 (`fix/bff-dns-multihome-latency` → `develop`, ainda não mergeado)
recebeu um segundo commit persistindo `BFF_DNS_SERVERS` no pipeline de deploy: `-DnsServers`
opcional em `scripts/Deploy-Iis.ps1:5,308-310` (gera a linha `$env:BFF_DNS_SERVERS = '...'` no
`Start-Bff.ps1` somente se o valor não for vazio — sem valor, comportamento padrão do Node é
mantido, já que `server/src/config.ts:parseDnsServers` trata ausência como no-op), referenciado
em `.github/workflows/deploy.yml` via `vars.BFF_DNS_SERVERS` (mesmo padrão de `PUBLIC_HOST`,
mas **não obrigatório**). A variável de repositório foi criada com
`gh variable set BFF_DNS_SERVERS --body "172.31.250.251,172.31.250.252"` no repo
`LayoutParser/LayoutParserReact` (esses são os dois DNS internos já configurados na interface
`Ethernet` do host de produção `BRNDDAPPBLD01`, validados como corretos e rápidos isoladamente).

**Por que:** o commit anterior do PR #153 (`c633b7b`) introduziu `BFF_DNS_SERVERS` em
`server/src/config.ts`/`dnsOverride.ts` para contornar um bug real de login lento/flaky em
produção (~11-12s), causado por resolução DNS lenta num host Windows com múltiplas interfaces
de rede ativas (multi-homed). Sem essa persistência no pipeline, o próximo deploy geraria um
`Start-Bff.ps1` sem a variável, e o bug voltaria.

**Patch manual do release ATIVO (montado, aprovação pendente do usuário antes de executar):**
mesmo padrão do patch anterior de `BFF_PUBLIC_ORIGIN`, ver
[[project_bff_public_origin_manual_patch_2026_08_23]]. Passos: localizar o `Start-Bff.ps1` do
release atualmente ativo (symlink/state em `$DeployRoot/state`), adicionar a linha
`$env:BFF_DNS_SERVERS = '172.31.250.251,172.31.250.252'` (mesmo estilo da linha existente de
`BFF_PUBLIC_ORIGIN`), depois restart isolado da Scheduled Task `LayoutParserFrontend-BFF` (sem
tocar no site IIS nem na task do Cloudflare).

**Status:** este patch manual é TEMPORÁRIO — some no próximo deploy normal (pipeline já
persiste o valor a partir deste commit em `fix/bff-dns-multihome-latency`, então basta esse PR
mergear e um novo deploy rodar para o valor ficar definitivo; até lá, se o usuário quiser o
ganho de latência já em produção, precisa aplicar o patch manual). Antes de assumir que o DNS
override está ativo em produção, confirme se o patch manual foi de fato aplicado (ou se o PR
#153 já foi mergeado e um deploy novo rodou depois).
