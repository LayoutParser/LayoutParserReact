---
name: codeql-dependency-review-need-ghas
description: CodeQL e dependency-review falham em TODA PR/branch deste repo por falta de GitHub Advanced Security (repo privado) — não é regressão de código, e ajustar permissões do workflow não resolve
metadata:
  type: project
---

Três checks falham de forma permanente neste repo e **não indicam problema no código da PR**:

| Check                                                       | Erro real                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Analyze (javascript-typescript)` / `Analyze (actions)`      | "Advanced Security must be enabled for this repository to use code scanning" |
| `Bloquear dependencias vulneraveis` (dependency-review)      | "Dependency review is not supported on this repository... Dependency graph + GHAS" |

O repo é **privado** e `GET /repos/:owner/:repo` devolve
`security_and_analysis.advanced_security: null` — ou seja, GHAS não está habilitado. Nessa
condição o CodeQL até roda a análise inteira e gera o SARIF; o job só quebra no **upload** dos
resultados. O dependency-review morre em ~6s, antes de qualquer análise.

**Why:** confirmado em 2026-08-15 comparando runs: o workflow `codeql.yml` falha desde pelo
menos 2026-08-13 em `develop`, `main` e em toda branch de feature — não é regressão introduzida
por nenhuma PR. Vale notar que o commit `fe7e030` ("grant `actions:read` to CodeQL analyze job")
foi uma tentativa de corrigir isso tratando o sintoma como permissão de workflow; **não
resolveu**, porque a causa é entitlement de GHAS, não escopo de token.

**How to apply:** ao avaliar CI de uma PR aqui, considere verdes apenas
`Lint, tipos, testes, builds e seguranca` e `Fluxo TXT para XML (desktop e mobile)` — são os
que de fato exercitam o código. Se os três acima falharem, cite como pré-existente e siga; não
tente "consertar" o workflow. Habilitar GHAS (ou tornar o repo público) é decisão de
custo/exposição do usuário, não do agente — pare e pergunte, conforme
[[feedback_parar_em_parede_de_permissao]]. Antes de repetir esse diagnóstico, revalide com
`gh api repos/LayoutParser/LayoutParserReact --jq .security_and_analysis`, porque o dia em que
GHAS for ligado esta memória vira obsoleta ([[feedback_verificar_diagnostico_independente]]).
