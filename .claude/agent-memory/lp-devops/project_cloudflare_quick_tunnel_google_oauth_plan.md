---
name: project-cloudflare-quick-tunnel-google-oauth-plan
description: HISTÓRICO/OBSOLETO — plano de expor o BFF via Cloudflare Quick Tunnel; substituído por binding HTTPS direto com layoutparser.duckdns.org (removido em 2026-08-26)
metadata:
  type: project
---

**OBSOLETO desde 2026-08-26.** Produção migrou para binding HTTPS direto no IIS via
`layoutparser.duckdns.org` (DuckDNS), com `PUBLIC_HOST` validado em `Deploy-Iis.ps1`. O
Cloudflare Quick Tunnel deixou de ser necessário e foi removido: `scripts/Register-CloudflareTunnel.ps1`
excluído do repo, e o switch `-EnableCloudflareTunnel`/bloco opt-in retirado de
`scripts/Deploy-Iis.ps1`. No servidor de produção, a Scheduled Task `Cloudflared-QuickTunnel`
deve ser removida (`Unregister-ScheduledTask -TaskName 'Cloudflared-QuickTunnel' -Confirm:$false`)
e o log `cloudflared-tunnel.log` pode ser arquivado/limpo. Nenhuma variável/secret `CLOUDFLARE_*`
foi encontrada nos GitHub Environments `development`/`production` — nada pendente de limpeza lá.
Mantido abaixo o registro histórico do plano original, só para referência.

---

Levantamento feito em 2026-08-15: usuário quer, eventualmente, rodar `cloudflared tunnel --url
http://127.0.0.1:3100` no host de produção (IIS + BFF) para conseguir um domínio HTTPS real,
já que o Google OAuth recusa redirect URI com IP puro (só aceita domínio ou `localhost`).

**Porta confirmada:** o BFF em produção escuta em `127.0.0.1:3100` (`$BffPort` padrão do
`scripts/Deploy-Iis.ps1`, health check em `http://127.0.0.1:$Port/health`). Se a instalação usar
outra porta, ajustar o comando do túnel para `-BffPort`.

`cloudflared` **não está instalado neste ambiente WSL de dev** (`which cloudflared` vazio) — é
esperado, pois o túnel deve rodar no host Windows de produção, não aqui.

**Por que:** viabilizar redirect URI válido no Google Cloud Console sem expor IP/porta interna
diretamente, mantendo o BFF em loopback.

**Como aplicar:** ao usuário pedir para de fato criar o túnel, seguir o checklist entregue no
chat (instalar cloudflared no host de produção → `cloudflared tunnel login` interativo →
`cloudflared tunnel --url http://127.0.0.1:3100` → pegar a URL trycloudflare.com → configurar
Cloudflare Access com allowlist de e-mail da equipe → cadastrar a URL como redirect URI no Google
Cloud Console). Nenhuma mudança de produção foi feita nesta tarefa — é só preparo/documentação.
Link com [[project_quality_pipeline_2026_08_10]] para arquitetura IIS→BFF→API.
