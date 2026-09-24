---
name: project-login-loop-setcookie-investigation-2026-09-15
description: Diagnóstico do loop de login em produção (Set-Cookie ausente) — revisão de código/config feita, causa raiz ainda NÃO confirmada por falta de acesso ao host de produção.
metadata:
  type: project
---

Usuário reportou loop de login em `https://layoutparser.duckdns.org/workspace`: OAuth com Entra
completa (`/auth/callback` → 303 → `/workspace`), mas `GET /api/workspaces/me` responde 401 e o
usuário cai de volta no login. Um `.har` capturado pelo navegador do usuário mostrou que **nenhuma
das 21 respostas do domínio no HAR trazia `Set-Cookie`** — nem em `/auth/login` nem em
`/auth/callback`.

Revisão de código/config feita nesta sessão (2026-09-15), sem encontrar bug óbvio:

- `server/src/app.ts:204-215` — `@fastify/secure-session` 8.3.0, `cookieName:
'__Host-layoutparser_session'` em produção, `cookie: { path: '/', secure: true, sameSite: 'lax'
}`. Sem `Domain` — respeita as regras do prefixo `__Host-`.
- `server/src/app.ts:171-173` — `trustProxy: false` é proposital (BFF confia na conexão TCP real
  do IIS, não em `X-Forwarded-*`); não deveria impedir o Fastify de emitir `Set-Cookie`, já que
  `secure: config.isProduction` é estático, não depende de detecção de protocolo.
- `public/web.config` — só tem regras de rewrite **inbound** (`/auth`, `/api`, SPA fallback) e
  `customHeaders` que adicionam CSP/HSTS/etc.; **nenhuma regra outbound** mexe em `Set-Cookie`.
- `scripts/Deploy-Iis.ps1:223-232` — o deploy já configura
  `system.webServer/proxy/enabled = true` e `reverseRewriteHostInResponseHeaders = false`
  (evita o ARR reescrever `Domain`/`Path` de cookies incorretamente). Isso é a configuração
  recomendada para não corromper `Set-Cookie` via ARR.

**Não encontrada causa raiz.** Faltou o passo decisivo: testar ao vivo se o `Set-Cookie` sai do
processo Node (direto em `127.0.0.1:3100`, sem IIS) e comparar com o que chega via HTTPS público —
isso isola se o problema é no BFF ou entre o IIS/ARR e o navegador. **Este ambiente (sandbox WSL
usado pelo Claude Code) não tem acesso credenciado ao host Windows de produção** (sem
SSH/RDP/WinRM configurado) — ver [[feedback-agent-credential-boundary]]. Não tentei contornar via
interop Windows sem confirmar com o usuário.

**Próximo passo (quem tiver acesso ao host de produção):**

1. No host de produção, `curl -i http://127.0.0.1:3100/auth/callback?...` (ou reproduzir login
   real) e conferir se `Set-Cookie` aparece na resposta direta do Node.
2. Repetir via `https://layoutparser.duckdns.org/auth/callback...` e comparar.
3. Se sumir só no passo 2 → revisar ARR/compressão dinâmica (`system.webServer/urlCompression`,
   `system.webServer/httpCompression`) e logs de falha do ARR (`%SystemDrive%\inetpub\logs\ARR\`
   ou Failed Request Tracing) — não há causa confirmada ainda no `web.config` nem no
   `Deploy-Iis.ps1` atuais.
4. Se sumir já no passo 1 → é bug de app (`server/src/oidc.ts` / `@fastify/secure-session`) →
   devolver para quem mantém `server/src/app.ts`/`oidc.ts` (fora da alçada de infra).

Sem confirmação, **não há correção aplicada** — só descarte de hipóteses de config versionada.

## Atualização 2026-09-15 (tarde) — Bug #253, hipótese de tenant descartada pela API

Time da API investigou e descartou a hipótese de allowlist de tenant/provisionamento prévio. O
401 "Identidade não resolvida." só ocorre em 3 cenários; o principal suspeito era infra:
**Cenário 1** — conexão BFF→API não chega como loopback, então a API ignora silenciosamente os
headers de identidade (`TrustIdentityFromLoopbackOnly=true`).

Verifiquei por via legítima (sem SSH em produção, que não tenho nesta sessão — ver
[[feedback-agent-credential-boundary]]):

- `gh variable list` → `LAYOUTPARSER_API_URL = http://127.0.0.1:5000`, sem alteração desde
  2026-08-11.
- `gh run list --workflow=deploy.yml` → último deploy bem-sucedido em `2026-09-15T11:20:37Z`,
  ~2h30 antes do correlationId do incidente (`07e5f113-441f-49c2-ac42-4ee13365738a`,
  `2026-09-15T13:47:20.288Z`).
- `server/src/config.ts:137-170` (`parseUpstreamUrl`) confirma que `127.0.0.1` cai no branch de
  loopback aceito sem exigir HTTPS.

**Conclusão parcial:** a configuração de deploy _declarada_ aponta para loopback e foi aplicada
com sucesso pouco antes do incidente — reduz a probabilidade do Cenário 1, mas **não confirma ao
vivo** (não consultei o processo Node real em produção, nem o socket TCP efetivo). Há precedente
de drift entre config declarada e `.env` real do release já visto neste projeto:
[[project-bff-public-origin-manual-patch-2026-08-23]] (patch manual que não sobrevive a novo
deploy). Pendência: confirmar `LAYOUTPARSER_API_URL` efetivo no processo em execução e/ou
`remoteAddress` do socket até a API, por quem tiver acesso real ao host.
