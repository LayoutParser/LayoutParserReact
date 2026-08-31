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

## Autoria fiscal assistida

- O primeiro fluxo de referência é FIAT NF-e 4.00: amostra MQSeries/IDoc + layout + Excel + XSD.
- O front revisa `MappingDraftRule` da API; não infere regra fiscal nem executa LLM no browser.
- Ações de autoria existem somente para TCL/XSL/XSLT.
- Sysmiddle tem capability read-only e deve permanecer sem editor mesmo por deep link/estado
  adulterado; a API também nega mutação.
- PBIs front #201–#204 e gates #205–#206; dependências API #103 e #229–#232.
- Não iniciar telas falsas antes dos contratos; o primeiro código após a API é o wizard do pacote.
