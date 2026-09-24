---
name: project-fiscal-gates-triage-2026-09-03
description: Triagem 2026-09-03 — #197/#203 movidas para In Review; #200/#205/#188/#206 confirmados como bloqueados por dependência cross-repo na LayoutParserApi. #198 e #201 atualizados em 2026-09-04, ver [[project_fiscal_gates_update_2026_09_04]].
metadata:
  type: project
---

Triagem completa em 2026-09-03 (sessão com evidência técnica e de segurança já coletada,
sem acesso à API local em `127.0.0.1:5100`).

**Movidas para In Review** (implementação completa, gates de qualidade passaram):

- #197 histórico de análises fiscais por workspace — commit `a6c089a` em `develop`.
- #203 diff de artefatos TCL/XSL/XSLT — commit `73ce557` em `develop` (fecha lacuna de diff;
  autoria já existia antes). Ressalva: pode não cobrir 100% do escopo original da issue.

**Gates com veredito PASS COM RESSALVA de @lp-security (Iris), mantidos bloqueados:**

- #200 (contratos API workspace/explicabilidade) e #205 (Sysmiddle read-only): front implementa
  corretamente (eTag/If-Match, isolamento por workspaceId, guards client-side contra engine
  Sysmiddle), mas a barreira server-side equivalente não pôde ser testada (API inacessível).
  Bloqueio remanescente é confirmação cross-repo pela equipe da `LayoutParserApi`, não código do
  front.

**Confirmado bloqueio 100% cross-repo:**

- #188 (promover detecção automática): `/api/parse/auto` só existe em `develop` da
  `LayoutParserApi`, não em produção (ref: `LayoutParserApi#222`). #177/#178 já implementados,
  aguardam só #188.
- #198 (catálogo de mappings fiscais): CORREÇÃO 2026-09-04 — nada foi implementado (não apenas
  falta listagem). `MappingGovernanceController` só expõe approve/publish/rollback por
  `releaseId` já conhecido, não um catálogo. Ver [[project_fiscal_gates_update_2026_09_04]].
- #206 (caso FIAT e2e): não iniciada; falta fixture sintética, API em produção (herda #188) e
  teste e2e do fluxo completo.

**Por quê isso importa:** vários gates do board deste repo dependem de trabalho na
`LayoutParserApi` que não está sob controle deste time/agente. Ao reavaliar esses gates no
futuro, não tratar como "falta esforço do front" — verificar primeiro se a API já promoveu o
endpoint/contrato correspondente em produção.

**Como aplicar:** antes de fechar #188, #198, #200, #205, #206, confirmar status do lado da
API (endpoint em produção, teste de integração de isolamento por workspace, endpoint de
listagem de mapping packages). Ver também [[project_fiscal_workspaces_2026_08_31]] e
[[project_auto_layout_detection_board_2026_08_29]].
