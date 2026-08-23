---
name: project_bff_public_origin_manual_patch_2026_08_23
description: Patch manual e temporário de BFF_PUBLIC_ORIGIN no Start-Bff.ps1 do release ativo, aplicado em 2026-08-23 para destravar login via Cloudflare Quick Tunnel.
metadata:
  type: project
---

Em 2026-08-23, com aprovação explícita do usuário, foram montados (não executados por mim —
entregues como comandos prontos) os passos para editar manualmente `Start-Bff.ps1` do release
em produção, trocando a linha `$env:BFF_PUBLIC_ORIGIN = '...'` de `https://BRNDDAPPBLD01`
(binding IIS) para `https://toll-packages-bell-squad.trycloudflare.com` (URL do Quick Tunnel
ativa naquele momento), seguido de restart isolado da Scheduled Task `LayoutParserFrontend-BFF`
(sem tocar no site IIS nem na task do Cloudflare).

**Por que:** `BFF_PUBLIC_ORIGIN` é gerado a cada deploy por `Deploy-Iis.ps1:303` a partir da
variável `PUBLIC_HOST` do workflow (ainda `BRNDDAPPBLD01`), mas o login OIDC via Entra depende
do redirect URI bater com a origin pública real, que hoje é o hostname do Cloudflare Quick
Tunnel (efêmero — muda a cada novo tunnel registrado). Ver
[[project_cloudflare_tunnel_task_never_registered_2026_08_22]] e
[[project_cloudflare_tunnel_url_extraction_regex_bug]] para o histórico do tunnel.

**Como aplicar:** este patch é MANUAL e TEMPORÁRIO — some no próximo deploy normal (`git push`
→ pipeline → `Deploy-Iis.ps1` regenera `Start-Bff.ps1` do zero). Não tratar esse valor como
definitivo. A correção real (discutida, não implementada) é desacoplar `BFF_PUBLIC_ORIGIN` do
`PUBLIC_HOST`/binding IIS — por exemplo, lendo a origin pública dinamicamente do output do
Register-CloudflareTunnel em vez de hardcodar no deploy. Antes de assumir que o login está
saudável em produção, confirme se este patch manual ainda está de pé (release pode ter mudado
com novo deploy) e se a URL do Quick Tunnel ainda é a mesma (ela muda se o tunnel foi
re-registrado).
