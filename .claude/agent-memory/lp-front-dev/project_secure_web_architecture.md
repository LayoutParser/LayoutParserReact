---
name: secure-web-architecture
description: Arquitetura vigente do LayoutParser Web: React same-origin, BFF Node e API .NET como fonte da verdade.
metadata:
  type: project
---

# Arquitetura web vigente — 2026-08-10

- O navegador usa somente `/api`; `VITE_API_BASE_URL` fica vazio por padrão.
- Em desenvolvimento, `npm run dev` inicia Vite e BFF. O proxy do Vite injeta uma identidade
  fictícia local; o BFF proíbe esse mecanismo em produção.
- Em produção, IIS HTTPS + autenticação Windows sobrescreve `X-IIS-User` e encaminha `/api`
  ao BFF em loopback. O BFF valida o IP do proxy, aplica allowlist admin, rate limit, limite de
  25 MiB no documento/32 MiB na requisição e propaga correlation ID.
- O BFF Node/Fastify não duplica parsing. `LayoutParserApi` continua fonte da verdade para
  parsing, catálogo, validação, IA e transformação.
- Router 7.18 substituiu Router 6; rotas são lazy, com fallback e error boundaries.
- O fluxo crítico entrega o XML bruto da API por visualização, cópia e download. Formatação é
  apenas visual.
- `npm run quality` cobre front, BFF, artefato de produção, auditoria moderada e contrato;
  Playwright desktop/mobile roda em job próprio.
