---
name: verificar-diagnostico-independente
description: sempre reproduzir a verificação-chave de um diagnóstico entregue por outro agente/orquestrador antes de assinar embaixo, mesmo que o resumo pareça completo e bem embasado
metadata:
  type: feedback
---

Quando o orquestrador (ou outro agente) entrega um diagnóstico pronto (ex.: "essa falha de CI
não tem relação com a feature X, é dívida pré-existente, risco de produção zero"), **sempre
reproduzir com as próprias ferramentas** pelo menos a(s) verificação(ões)-chave antes de
concordar — não basta confiar no resumo, mesmo citando arquivos/logs específicos.

**Why:** em 2026-07-20, ao investigar falha do `ci-dev.yml` na branch
`feat/xml-transformation-toggle` (commit `995e915`), o orquestrador pediu explicitamente essa
contra-checagem ("confirme com seus próprios olhos, não só confie no meu resumo"). A
verificação independente — `git diff main -- <6 arquivos com erro>` (retornou vazio, ou seja,
idênticos a `main`), `git show --stat` do commit pushado (nenhum dos 6 arquivos aparece no
diff) e leitura direta de `treeBuilder.ts` em `main` na linha do erro — confirmou o
diagnóstico ponto a ponto. Sem essa reprodução, o veredito "risco de produção zero" seria só
uma alegação repassada, não uma confirmação com peso próprio. Ver
[[project_ci_dev_dual_pipeline]].

**How to apply:** em qualquer handoff que chegue com "já confirmei X/Y/Z", rodar pelo menos
1-2 comandos que **provariam o diagnóstico errado se ele estivesse errado** (diff direto,
leitura de log/arquivo na fonte) — não apenas reler o resumo e concordar. Vale tanto para
diagnósticos de "não é problema meu/não precisa ação" quanto para os que pedem ação direta
(estes últimos merecem verificação ainda mais rigorosa antes de qualquer `git push`).
