---
name: project-layout-tree-target-empty-release-question
description: layout-tree target.roots vazio (API#433 criada, ainda aberta) e release TCL/XSL/XSLT ausente para mapper real (ESCLARECIDO — não é bug, é pipeline ainda não executado, rastreado em API#438)
metadata:
  type: project
---

Testando #267 (Mapping Studio, já em produção) contra o mapper real
`MAP_f1a6453f-1b2a-44db-b58d-fad5be74bba7`, dono do produto achou 2 gaps de dado (2026-09-16):

1. **`target.roots` vazio na API.** `GET .../layout-tree` devolve `target.roots: []` mesmo com
   `rules[].targetElementGuid` apontando GUIDs válidos (`TAG_...`) do lado destino — a API sabe
   o vínculo mas não constrói a árvore de destino. Issue criada:
   LayoutParser/LayoutParserApi#433 (linka #425/PR#427 e #267). Comentado em #267 como gap
   conhecido, não bloqueante (front já trata `target.roots` vazio sem quebrar).

2. **Release TCL/XSL/XSLT não aparece — RESOLVIDO/ESCLARECIDO (2026-09-16).** Time API
   respondeu: não é bug, é estado real — nenhum release (completo ou incompleto) foi gerado
   pra esse mapper porque o pipeline completo ainda não rodou pra ele (o experimento usou o
   `.tcl` da Neogrid direto, sem passar por mapper Sysmiddle real; fix de MQSeries só resolve
   aprendizado do layout de entrada, não gera release sozinho). Rodar o pipeline pra esse e os
   demais 19 mappers é pendência deles, rastreada em `LayoutParserApi#438` — não é ação nossa.
   `GET /api/reference-examples` confirmado como confiável pra referência/calibração (não é o
   release do mapper). Comentado em #267 (comentário 2026-09-16) encerrando esse ponto.

**Why:** valida que mesmo com #425/#427 fechados e #267 em produção, a paridade real com
Connect-Us (árvore dupla completa) ainda tem gap de dado do lado da API (item 1, API#433 segue
aberto). O item 2 (release) não era gap — era só pipeline não executado ainda.

**How to apply:** ao revisitar #267 ou o Mapping Studio, verificar se API#433 (target.roots
vazio) foi resolvida antes de assumir que a árvore de destino está completa. O ponto do release
(item 2) está encerrado — não recriar pergunta nem issue própria; se precisar acompanhar, é via
`LayoutParserApi#438` do lado deles.

Relacionado: [[project_mapping_studio_connect_us_desbloqueio_2026_09_16]],
[[project_267_pr271_closure_2026_09_16]].
