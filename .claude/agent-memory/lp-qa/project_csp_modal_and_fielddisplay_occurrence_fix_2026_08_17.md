---
name: csp-modal-and-fielddisplay-occurrence-fix
description: Validação do branch fix/csp-inline-style-e-multipla-ocorrencia (2 commits) — PASS via gates + revisão estática, sem browser real disponível.
metadata:
  type: project
---

Branch `fix/csp-inline-style-e-multipla-ocorrencia` (a partir de `develop`), 2 commits:
`1f6d479` (Modal: `document.body.style.overflow` → classe `body.modal-open`, evita CSP
`style-src`) e `17e4c0f` (FieldDisplay: `content-visibility`/`contain-intrinsic-size` fixo em
2rem subestimava altura de linhas com indicador de ocorrência múltipla, causando sobreposição
visual).

**Why:** registrar que não havia ferramenta de browser interativo disponível nesta sessão —
a validação manual (console CSP, visual de ocorrências) foi feita por revisão estática de
código (Modal.tsx/css, FieldDisplay.tsx/css, `server/src/app.ts` helmet config) em vez de
`npm run dev` + captura de tela real. Achado adicional: o helmet neste projeto usa apenas
`strictTransportSecurity` customizado, sem `contentSecurityPolicy` explícito — os defaults do
`@fastify/helmet`/helmet incluem `style-src 'self' 'unsafe-inline'`, então o erro de CSP
descrito no handoff pode não se manifestar com a config atual; o fix ainda é boa prática
(remove dependência de `unsafe-inline`) e não foi bloqueado por isso.

**How to apply:** quando não houver acesso a browser real, declarar isso explicitamente no
veredito em vez de simular validação manual; complementar com leitura de código dos pontos
críticos (config de CSP/helmet, lógica de render) e todos os gates automatizados (`npm run
quality` completo: lint, typecheck, test:coverage, format:check, audit, contract:check) e
`git diff --check`. Todos passaram limpos neste caso: 34 arquivos de teste, 175 testes.
