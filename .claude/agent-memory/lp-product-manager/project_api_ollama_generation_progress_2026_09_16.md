---
name: project-api-ollama-generation-progress-2026-09-16
description: update do time API sobre geração real de TCL/XSL/XSLT via Ollama fine-tuned (13/19 mapeadores Sysmiddle corrigidos, 1o experimento real bem-sucedido) e novo endpoint GET /api/reference-examples
metadata:
  type: project
---

Update recebido do time API/Ollama (2026-09-16), comentado em
LayoutParser/LayoutParserReact#199 (PBI: Mapping Studio autoria TCL/XSL/XSLT — dependência
declarada de LayoutParserApi#103/#226/#227):

1. **Bug corrigido:** parsing MQSeries tratava arquivo inteiro como uma linha só, zerando
   aprendizado de 13/19 mapeadores Sysmiddle. Todos os 19 agora utilizáveis como insumo.
2. **Primeiro experimento real (não simulado):** geração via Ollama fine-tuned para
   Inutilização de NF-e — 10/11 campos idênticos ao XSLT real de produção da Neogrid.
   Persistência ponta a ponta validada.
3. **Novo endpoint `GET /api/reference-examples`:** expõe exemplos reais Neogrid (TCL+XSL)
   marcados como referência, separados de release real de cliente.
4. **Gaps conhecidos (lado deles):** campo com regra de negócio não inferível só do layout;
   casca do XML (namespace/template raiz) ainda ausente no XSLT gerado.
5. Próximo passo do time API: expandir para CT-e/MDF-e/NFS-e, depois testar contra os 19
   mapeadores Sysmiddle reais.

**Why:** é trabalho do time API/Ollama, não nosso, mas informa diretamente a dependência
declarada em #199 (autoria TCL/XSL/XSLT no Mapping Studio depende da maturidade da geração via
IA) e pode explicar/aliviar (não resolver de forma confirmada) a investigação em
[[project_layout_tree_target_empty_release_question_2026_09_16]] sobre o mapper
`MAP_f1a6453f...` sem release — ainda não confirmado se esse mapper está entre os 13 corrigidos.

**How to apply:** ao revisitar #199 ou a investigação do release vazio, checar se o time API já
confirmou se `MAP_f1a6453f...` está entre os 19 mapeadores agora utilizáveis, e se a casca XML
(namespace/template raiz) já foi resolvida antes de considerar autoria real viável. O endpoint
`GET /api/reference-examples` é candidato a consumo futuro no catálogo (#198) — **não criar
Story sem pedido explícito do usuário**, só lembrar que existe.

Relacionado: [[project_layout_tree_target_empty_release_question_2026_09_16]],
[[project_fiscal_api_gaps_issues_2026_09_16]].
