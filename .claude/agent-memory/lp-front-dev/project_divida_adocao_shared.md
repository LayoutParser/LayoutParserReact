---
name: project-divida-adocao-shared
description: shared/Button e shared/Modal parecem código morto mas são dívida de ADOÇÃO, não lixo — 29 botões feitos à mão deveriam reusá-los; não apague sem inverter a pergunta antes.
metadata:
  type: project
---

`src/components/shared/` tem `Button`, `Modal` e `Tabs`. Uma varredura ingênua de órfãos
marca Button e Modal como "não importados por ninguém" e sugere apagar. **É a leitura
errada** (verificado em 2026-08-10).

**Why:** o `frontend-standards.md` §4 manda "reuse `components/shared` antes de criar markup
novo". Se o componente existe e ninguém usa, o defeito pode estar em quem NÃO o usou —
apagar consolida a dívida em vez de resolvê-la. E há prova de que a biblioteca é viva:
**`shared/Tabs` JÁ é adotado** por `AnalysisModeTabs.tsx`, ou seja, o padrão funciona.

Evidência levantada (contagem de `<button>` escrito à mão, fora de `shared/`):

| Arquivo                                                                                                                  | `<button>` |
| ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `analysis/XmlTransformationDisplay.tsx`                                                                                  | 5          |
| `admin/AdminPage.tsx` · `admin/LayoutValidationTab.tsx` · `aiMetrics/AiMetricsPanel.tsx` · `layout/LayoutParserPage.tsx` | 4 cada     |
| `admin/MonitoringTab.tsx` · `analysis/StructureTree.tsx`                                                                 | 3 cada     |
| `analysis/FieldSearch.tsx`                                                                                               | 2          |

29 no total, em 8 arquivos, e **nenhum** usa as classes `.btn`/`.btn-*` que o
`shared/Button.css` define — cada um tem classe própria (`retry-btn`, `tree-control-btn`...).
Adotar não é substituição mecânica: exigiria mapear esses estilos para as `variant`
(`primary|secondary|success|danger|warning`) ou passar `className`.

**Modal é caso diferente de Button:** não há NENHUM markup de modal/overlay/backdrop no
projeto. Não é dívida de adoção — é componente sem demanda ainda. Continua órfão legítimo.

**How to apply:** ao varrer órfãos, para qualquer coisa em `shared/` inverta a pergunta antes
de propor remoção — "existe markup à mão que deveria estar usando isto?". Se existir, o
veredito é _adotar_, não _apagar_, e a decisão de quando adotar é do usuário (é refactor de
UI com impacto visual, território do [[convencoes-reais-vs-doc]] e do `@lp-ui-ux`).
