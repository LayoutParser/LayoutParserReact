---
name: oidc-auth-flow
description: Contrato do fluxo OIDC (Entra + Google) no BFF — rotas, authError genérico entre provedores e onde cada um injeta identidade.
metadata:
  type: project
---

# Fluxo de login OIDC — `server/src/oidc.ts` + `src/layouts/MainLayout.tsx`

- Dois provedores registrados em paralelo por `registerProviderRoutes` (mesmo código, config
  distinta): Entra (`/auth/login` + `/auth/callback`) e Google (`/auth/google/login` +
  `/auth/google/callback`). `server/src/config.ts` só instancia cada client quando as env vars
  correspondentes existem (`ENTRA_TENANT_ID`/`ENTRA_CLIENT_ID`/`ENTRA_CLIENT_SECRET` ou
  `GOOGLE_CLIENT_ID`+`GOOGLE_CLIENT_SECRET`); sem elas, a rota de login responde 503 direto (nunca
  chega a redirecionar) — ver [[project_local_env_secrets_gap]].
- **`authError` é genérico entre provedores.** Os códigos (`access_denied`, `invalid_callback`,
  `login_failed`, `temporarily_unavailable`) não carregam qual provedor falhou — não existe
  parâmetro `provider` na querystring de erro. Por isso as mensagens em
  `src/components/auth/authenticationMessages.ts` (consumidas por `AuthenticationGate` e por
  `HomePage`) precisam ser neutras (nunca citar "Microsoft" ou "Google" especificamente).
  Já aconteceu de `login_failed` citar só Microsoft e aparecer para quem tentou Google — corrigido
  em 2026-08-14 (mensagem neutra + teste em `AuthenticationGate.test.tsx`/`HomePage.test.tsx`
  que falha se o texto citar qualquer um dos dois provedores). Se algum dia o BFF passar a incluir
  `provider` no redirect de erro, dá para ter mensagens específicas — até lá, manter neutro.
- `errorRedirectLocation(returnTo, code)` (em `server/src/oidc.ts`) redireciona de volta para o
  `returnTo` original da transação — antes de 2026-08-14 caía sempre em `/upload` hardcoded.
  Isso importa porque `MainLayout` só renderiza a home pública (`HomePage`) quando
  `location.pathname === '/'`; qualquer outra rota mostra o `AuthenticationGate` genérico. Um erro
  que sempre caísse em `/upload` fazia qualquer falha de login (mesmo vinda da home) parecer um
  loop de volta para uma tela diferente da esperada. `transaction.returnTo` só é confiável quando
  a transação (cookie de sessão) sobreviveu à ida-e-volta até o IdP; no branch `invalid_callback`
  (transação ausente/expirada/provedor cruzado) o fallback é sempre `'/'`, nunca `/upload`.
- Testes de contrato ponta a ponta desse fluxo vivem em `server/test/app.test.ts` via
  `app.inject` com `OidcClient` fake (sem rede real ao IdP) — é o padrão já aceito pela QA para
  validar OIDC sem subir o BFF de verdade (ver histórico de `@lp-qa`).
