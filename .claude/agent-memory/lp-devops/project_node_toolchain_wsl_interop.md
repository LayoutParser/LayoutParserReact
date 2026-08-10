---
name: node-toolchain-wsl-interop
description: npm/node deste ambiente são binários Windows via interop e WSLENV está vazio — env vars do bash NÃO chegam ao build, invalidando testes de override de VITE_*
metadata:
  type: project
---

Neste ambiente o `npm` resolvido no bash é **o binário do Windows**
(`/mnt/c/Program Files/nodejs/npm`), executado via interop WSL→Windows. O `node` sequer está no
PATH do bash. E **`WSLENV` está vazio**.

Consequência prática: variáveis de ambiente definidas no bash **não são propagadas** para o
processo Windows. Ou seja, `VITE_API_BASE_URL=x npm run build:prod` roda, sai com exit 0 e
**silenciosamente ignora a variável** — o bundle sai com o valor do arquivo `.env`, não com o
override.

**Why:** em 2026-08-10 usei exatamente esse comando para "validar" o override que o `ci-dev.yml`
faz antes do build. O override não apareceu no bundle e quase reportei como bug grave de CI
("front de dev buildando contra produção"). Não era: o CI roda PowerShell nativo no Windows,
onde `$env:VITE_API_BASE_URL = ...` funciona normalmente. O furo estava no meu teste, não no
pipeline. Confirmei a semântica correta lendo o código real do Vite 5.4.21 em
`node_modules/vite/dist/node/chunks/dep-*.js`: em `loadEnv`, o loop sobre `process.env` roda
**depois** do loop sobre os arquivos `.env` e sobrescreve — logo `process.env.VITE_*` vence.

**How to apply:** nunca conclua nada sobre precedência de env var a partir de um teste feito com
`VAR=valor npm ...` no bash daqui — o resultado é sempre "a env var foi ignorada",
independentemente do comportamento real. Para checar semântica de ferramenta (Vite, etc.), leia
o código em `node_modules/` (barato, sem interop, e é a fonte da verdade). Se for indispensável
exercitar a env var de verdade, isso exige interop/`WSLENV` — **pare e pergunte ao usuário**
antes, conforme [[feedback_parar_em_parede_de_permissao]]. Vale para qualquer var, não só
`VITE_*`. Ver também [[project_gh_cli_unavailable_wsl]] (mesmo padrão: toolchain do Windows
alcançado por interop).
