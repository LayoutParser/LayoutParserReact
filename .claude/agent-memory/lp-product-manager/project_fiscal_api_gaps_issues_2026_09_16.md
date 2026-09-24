---
name: project-fiscal-api-gaps-issues-2026-09-16
description: 4 issues cross-repo criadas na API para gaps de #199/#201/#202/#204 identificados na reavaliação de 2026-09-16.
metadata:
  type: project
---

Reavaliação de 2026-09-16 de #199/#201/#202/#204 (LayoutParserReact) confirmou 4 gaps
100% dependentes da API, sem rastreamento cross-repo até então. Issues criadas em
`LayoutParser/LayoutParserApi`, com link cruzado nos dois sentidos:

- API#421 (runner determinístico de TCL, equivalente ao XSLT) ↔ front#199
- API#422 (persistir resposta livre do revisor a pergunta da IA) ↔ front#202
- API#423 (suíte de teste versionada no Fiscal Test Lab, múltiplas fixtures + histórico) ↔ front#204
- API#424 (sinais de qualidade/conflito/ausência na ingestão da planilha fiscal) ↔ front#201

**Why:** sem a issue na API, o gap ficava só documentado em memória/comentário do front,
sem rastreabilidade nem chance de priorização pelo time dono do contrato.

**How to apply:** #199/#201/#202/#204 continuam com o status atual no Project #3 (In
Review/In Validation, conforme [[project_fiscal_199_201_202_204_reeval_2026_09_16]]) —
não fechar nem mudar status até a API entregar o contrato correspondente. Ao sincronizar
esse conjunto no futuro, checar o estado de API#421-424 antes de assumir que o gap segue
aberto.
