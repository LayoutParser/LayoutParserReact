---
name: local-env-secrets-gap
description: server/.env (segredos OIDC/Entra/Google reais) some entre sessões neste ambiente — confirmar antes de assumir que login ao vivo é testável.
metadata:
  type: project
---

Neste ambiente (WSL2 sobre Windows, máquina da Elson), `server/.env` — o único lugar com
`ENTRA_CLIENT_SECRET`/`GOOGLE_CLIENT_SECRET` reais para testar OIDC ao vivo — não persiste de
forma confiável entre sessões. Confirmado ausente em 2026-08-13 (nota da QA,
`project_google_oauth_and_idoc_edit_fix_2026_08_13.md`) e de novo em 2026-08-14 (eu, investigando
bug de login). Só existe `server/.env.example` (sem segredos).

**Why:** não confirmado se é o WSL/sandbox recriando o worktree, perda de estado entre sessões
do Claude Code, ou o arquivo sendo mesmo local/descartável por design (está no `.gitignore`,
nunca deveria ir para o repo). O efeito prático é o mesmo independente da causa.

**How to apply:** antes de tentar validar login Entra/Google ao vivo via `npm run dev`, checar se
`server/.env` existe (`ls server/.env`). Se não existir: sem `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
configurados, `parseGoogleConfig` devolve `google: null` e `/auth/google/login` responde 503
imediatamente — nenhum redirect, nenhuma mensagem de erro estilizada da nossa UI aparece (então se
o usuário relatar ter visto uma mensagem estilizada tipo "login_failed", é sinal de que o `.env`
_estava_ presente no momento do teste dele, mesmo que ausente agora). Não recriar esse arquivo com
segredos reais por conta própria — pedir para o usuário/`@lp-devops` restaurar (variáveis de
ambiente e segredos são domínio exclusivo de `@lp-devops`, ver `.claude/rules/agent-authority.md`).
Para validar o _código_ do fluxo de erro sem segredos reais, usar os testes de integração do BFF
(`app.inject` com `OidcClient` fake em `server/test/app.test.ts`) — cobre rota real, config real e
sessão real, só troca a chamada de rede ao IdP.
