# Fundação do workspace fiscal — 31/08/2026

## Handoff

- Branch: `codex/feat-fiscal-workspaces-foundation`.
- BFF passou a preservar provider/subject/tenant na identidade autenticada, remover headers
  forjados e reinjetar o principal somente ao upstream confiável.
- `/api/session` continua sem expor subject ao navegador.
- Tipos iniciais em `src/types/workspace.ts`; chamadas futuras ficam exclusivamente em
  `src/services/api/workspaceService.ts`.
- Não criar fallback local de histórico: endpoints dependem da API #225/#226.
- Gate #200 permanece Blocked até contrato API, isolamento e fixture XSLT existirem.

## Próximo incremento

Após `GET /api/workspaces/me` existir: criar store de contexto, shell `/workspace`, seletor e estados
loading/vazio/erro/403; depois histórico paginado. Não iniciar parser TCL/XSLT/Sysmiddle no React.
