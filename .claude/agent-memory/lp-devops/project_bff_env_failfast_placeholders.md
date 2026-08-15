---
name: bff-env-failfast-placeholders
description: Config do BFF é fail-fast — placeholder no VALOR de ENTRA_*/GOOGLE_* aborta o boot; placeholders devem ficar em COMENTÁRIO com a chave vazia.
metadata:
  type: project
---

Ao recriar `server/.env`, placeholders tipo `<PREENCHER: ...>` vão em **linha de comentário**
acima da chave, e a chave fica **vazia** (`GOOGLE_CLIENT_ID=`). Nunca como valor.

**Why:** `loadConfig` (`server/src/config.ts`) é fail-fast por par de provedor:
`hasAnyValue = Boolean(clientId || clientSecret.trim())` — qualquer valor não vazio liga a
validação de formato e um placeholder derruba o processo inteiro (`ConfigError` → `index.ts`
seta `process.exitCode = 1`), em vez do degradê pretendido. Verificado em 2026-08-14 chamando
`loadConfig` com env sintético: placeholder em `GOOGLE_CLIENT_ID` → "deve ser o Client ID
emitido pelo Google Cloud Console"; em `ENTRA_TENANT_ID` → "possui formato inválido"; só o
client id do par sem o secret → "GOOGLE_CLIENT_SECRET está ausente ou é curto demais". Com as
chaves vazias o BFF sobe e só a rota daquele provedor responde 503. Ou seja: preencher o **par
inteiro ou nada**.

Consequência ligada, também não óbvia: **não existe variável de chave de sessão/cookie** (o BFF
lê exatamente 25 env vars, nenhuma delas `SESSION_SECRET`). `deriveSessionKey`
(`server/src/oidc.ts`) faz HKDF do `ENTRA_CLIENT_SECRET`; sem Entra a chave é aleatória por
processo, então num setup **só com Google** todo restart do `npm run dev` (tsx watch) invalida
as sessões. Não inventar uma var de sessão para "resolver" isso — o código não a lê.

**How to apply:** vale para qualquer recriação de `server/.env` (que some entre sessões, ver
[[local-env-secrets-gap]] na memória do `@lp-front-dev`). Redirect URIs a registrar no IdP são
derivadas de `BFF_PUBLIC_ORIGIN` (a origem do **Vite, 3000**, não a porta do BFF 3100):
`/auth/callback` e `/auth/google/callback`. Segredo real só o usuário preenche — ver
[[feedback_parar_em_parede_de_permissao]].
