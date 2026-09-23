---
name: project-sample-document-closure-2026-09-15
description: Fechamento em lote do PBI "Gerar documento de exemplo" e stories filhas; obsolescência de #240 após LayoutParserApi#356 ir a produção
metadata:
  type: project
---

Em 2026-09-15, fechados com veredito PASS de @lp-qa e @lp-contract-qa: #238, #239, #241, #232,
#234, #244. Todos movidos para status `Done` no Project 3 (LayoutParserReact — Backlog).

**#237 (PBI "Gerar documento de exemplo")** e **#240 (Story "mensagem Xml não suportado")**
tinham label `blocked` por dependência de `LayoutParserApi#355`/`#356`. @lp-contract-qa
confirmou que `LayoutParserApi#356` (cobertura Xml) foi mergeada em `origin/master` da API em
2026-09-15 (commit d559e7c) e já está em produção.

**Decisão de produto:**

- #240 fechada como `not planned`/obsoleta — seu propósito (avisar que Xml não é suportado)
  deixou de existir; #241 confirma que o front já consome o endpoint real para Xml sem
  bloqueio client-side.
- #237 fechado como PBI concluído pelas Stories filhas (#238, #239, #241), com nota de que a
  visibilidade do botão diverge levemente da premissa original (não há sinal de "mapper
  vinculado" no contrato da API; quem decide é a resposta 404).

**Why:** dependências cross-repo (LayoutParserApi#355/#356) resolvidas tornaram os labels
`blocked` obsoletos; reavaliação de bloqueio é decisão de produto, não técnica, mesmo quando
detectada por @lp-contract-qa.
**How to apply:** ao reavaliar itens `blocked` por dependência externa, sempre confirmar com o
agente que detectou (ex.: @lp-contract-qa) se a dependência já está em produção antes de decidir
manter, desbloquear ou fechar como obsoleto. Ver [[project-generate-sample-document-2026-09-09]].
