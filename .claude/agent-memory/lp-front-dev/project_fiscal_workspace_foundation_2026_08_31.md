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

## Integração do Slice 1

- API PR #234 confirmou `GET /api/workspaces/me` e `GET /api/workspaces/{workspaceId}`.
- Branch front `codex/feat-workspace-shell-slice1`: store somente em memória, shell `/workspace`,
  seletor, estados loading/erro/sucesso e validação runtime do contrato.
- A rota raiz autenticada entra no workspace; `/upload` permanece disponível.
- O bootstrap do workspace ocorre somente ao entrar em `/workspace`; acesso direto a `/upload`
  não dispara SQL de identidade em paralelo ao parse. Depois de carregado, o store em memória
  mantém o seletor durante a navegação.
- E2E autenticado cobre desktop e mobile. Não iniciar parser TCL/XSLT/Sysmiddle no React.

## Slice 2 da API — pacote fiscal

- API PR #236 entregou somente criação multipart da revisão 1 e consulta do pacote.
- Campos: `sample`, `layout`, `spec`, `xsd`, `expectedXml`, `fiscalContext`; 50 MiB por artefato.
- PBI front #201 ainda depende de inventário normalizado, criação de revisão e navegação de
  projetos. Não gerar `projectId` silenciosamente no browser nem simular qualidade/conflitos.
- Antivírus real no host e inventário de Excel/XSD continuam pendentes na API #229.

## Autoria fiscal assistida

- O primeiro fluxo de referência é FIAT NF-e 4.00: amostra MQSeries/IDoc + layout + Excel + XSD.
- O front revisa `MappingDraftRule` da API; não infere regra fiscal nem executa LLM no browser.
- Ações de autoria existem somente para TCL/XSL/XSLT.
- Sysmiddle tem capability read-only e deve permanecer sem editor mesmo por deep link/estado
  adulterado; a API também nega mutação.
- PBIs front #201–#204 e gates #205–#206; dependências API #103 e #229–#232.
- Não iniciar telas falsas antes dos contratos; o wizard do pacote deve consumir o contrato real e
  expor como indisponível tudo que o backend ainda não entrega.
