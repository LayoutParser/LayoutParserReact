---
description: Taxonomia e fluxo operacional do GitHub Projects para o LayoutParser Web.
---

# Product Management — LayoutParser Web

## Registro oficial

- Project: **LayoutParser Web — Product Delivery**.
- Repositório: `LayoutParser/LayoutParserReact`.
- Views esperadas: `Backlog`, `Sprint`, `Board`, `Roadmap`, `Bugs & Gates`.
- Status: `Backlog`, `Ready`, `In progress`, `In review`, `In validation`, `Done`, `Blocked`.

## Taxonomia

| Dimensão        | Valores                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Tipo            | `type: epic`, `type: pbi`, `type: user-story`, `type: task`, `type: bug`, `type: gate`                                          |
| Prioridade      | `priority: p0`, `priority: p1`, `priority: p2`, `priority: p3`                                                                  |
| Área            | `area: product`, `area: frontend`, `area: ux`, `area: bff`, `area: security`, `area: devops`, `area: docs`, `area: integration` |
| Estado auxiliar | `blocked`, `retrospective`                                                                                                      |

`Status` vive no Project; labels representam classificação estável. Milestones representam
sprints ou marcos históricos.

## Hierarquia e conteúdo mínimo

### Epic

Objetivo, resultado de negócio, escopo/não escopo, métricas, PBIs filhos, riscos e dependências.

### PBI

Problema/oportunidade, hipótese de valor, critérios de aceite, Stories/Tasks filhos e evidência.

### User Story

Formato _Como/Quero/Para_, critérios Given/When/Then, UX/a11y, segurança, observabilidade e
dependências de contrato.

### Bug

Esperado, observado, reprodução, ambiente, impacto, evidência sem payload sensível, causa raiz
quando conhecida, correção e teste de regressão.

### Task e Gate

Task tem entrega verificável e responsável técnico. Gate referencia comando/check/deployment,
resultado esperado e evidência de saída.

## Fluxo

1. Capturar e classificar.
2. Refinar até `Ready`: valor, aceite, dependências, riscos e tamanho compreendidos.
3. Planejar sprint por capacidade e objetivo, não por urgência informal.
4. Mover conforme evidência de PR/check/deploy.
5. Fechar apenas após aceite; item histórico usa `retrospective` e links comprobatórios.
6. Rodar `/product-sync` após merge em `develop`, promoção a `main`, incidente ou mudança de escopo.

## Privacidade

Nunca publique TXT/XML real, segredo, token, e-mail, nome de usuário, log bruto ou caminho privado
desnecessário. Correlation ID pode ser usado; conteúdo de documento deve ser sintético/redigido.
