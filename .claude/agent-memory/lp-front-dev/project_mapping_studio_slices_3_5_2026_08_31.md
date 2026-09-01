# Mapping Studio — Slices 3 a 5 (31/08/2026)

## Entregue no front

- Services e validação runtime para `MappingDraft`, sugestões, ETag/`If-Match`,
  `MappingExplanation`, compilação, release e Test Lab.
- Rotas `/workspace/mapping-studio` e `/workspace/mapping-studio/:mappingId/:version`.
- Revisão human-in-the-loop de TCL/XSLT; Sysmiddle sem controles de autoria por construção.
- Compilação assíncrona, artefato visualizável/baixável e release reaberta por `releaseId` na URL.
- Fixture XSLT individual, XSD/diff/cobertura/provenance e correlation ID; XML nunca persiste no
  navegador.

## Contratos reais

- API #238: Draft/sugestões/decisões.
- API #240: explicação canônica; versões `draft` para TCL/XSLT e `current` para Sysmiddle.
- API #243: compile/job/release/test-runs.

## Gaps que o front não deve mascarar

- TCL/XSLT ainda retornam `capabilities.compile=false`; manter botão bloqueado até a API corrigir.
- Release XSLT não alimenta `MappingExplanation`; não interpretar código no browser.
- Não há listagem de releases: preservar `releaseId` somente na URL, sem inventar catálogo local.
- `UpdateRuleRequest.answer` não persiste o texto; não oferecer falsa resposta livre.
- TCL não possui runner determinístico; suite versionada e publicação pertencem a slices futuros.

## Segurança

Sysmiddle permanece apenas execute/explain. Não derivar capability de rota existente, não persistir
XML/TXT/IDs em `localStorage` e não executar XSLT no navegador.
