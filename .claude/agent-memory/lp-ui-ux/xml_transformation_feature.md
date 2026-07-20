---
name: xml-transformation-feature
description: Decisões de UX na feature "XML Transformação Final" (aba nova em AnalysisModeTabs) e por quê — evita relitigar.
metadata:
  type: project
---

Feature em desenvolvimento na branch `feat/xml-transformation-toggle` (nada commitado ainda em
2026-07-20 — Remy implementou a lógica/estado, eu revisei a UX; usuário revisa o diff completo
antes de qualquer commit). Adiciona uma 2ª forma de ver o documento processado: aba "TXT
Posicional" (a view antiga, sempre presente) e aba "XML Transformação Final" (só aparece se
existe Mapper cadastrado pro layout selecionado — checagem automática contra a API ao
processar o documento). Arquivos: `components/analysis/AnalysisModeTabs.tsx` +
`XmlTransformationDisplay.tsx` (e os `.css` ao lado). Ver também [[design-system-conventions]].

Decisões de UX e por quê (para não relitigar se o assunto voltar):

- **Disparo da transformação continua manual** (botão "Gerar Transformação XML", não dispara
  ao abrir a aba). Motivo: a chamada é potencialmente cara no back-end (decisão original do
  Remy). Auto-disparar ao trocar de aba criaria chamadas repetidas toda vez que o usuário só
  está explorando as abas, a menos que se adicione lógica de cache/guard — isso é mudança de
  lógica/estado, não de UI (seria handoff pro `@lp-front-dev`, não decidi sozinha). Se o custo
  real do back-end cair ou o padrão de uso mostrar muita fricção aqui, vale reabrir.
- **Formatação básica (indentação) do XML exibido**, sem lib nova — função pura
  `formatXmlForDisplay` dentro de `XmlTransformationDisplay.tsx` (regex-based: quebra linha e
  indenta por profundidade de tag). Só formatação visual, não altera o dado retornado pela
  API. Guard: se o XML tiver `CDATA`, devolve sem formatar (a lógica não trata esse caso —
  prefiro cru a arriscar quebrar a leitura). Não fiz syntax highlight (exigiria lib nova ou
  tokenizer próprio — fora do escopo combinado para este incremento).
- **`FieldSearch` (em `LayoutParserPage.tsx`, área `.l-top-right`) só aparece quando a aba
  ativa NÃO é `xml-transformacao`** — ele destaca campos em `FieldDisplay`, que não é
  renderizado nessa aba, então a busca ficava "viva" na tela sem nenhum efeito visível
  (resultado "1/3" aparecendo, mas nada destacado em lugar nenhum). `DocumentSummary`
  continua sempre visível (é informativo, não um controle que pode parecer quebrado).
  Implementado lendo `activeMode` de `useTransformationStore` dentro de `LayoutParserPage.tsx`
  (só leitura — não toquei em `handleSubmit`/fluxo de parse).
- A11y adicionada nos 2 arquivos: `role="status" aria-live="polite"` no aviso "Verificando
  transformações disponíveis..."; `role="alert"` no erro de execução; `aria-busy` no botão
  "Gerar"; `tabIndex + role="region" + aria-label` no `<pre>` do resultado (sem isso, quem não
  usa mouse não conseguia rolar um XML longo, já que só o `<pre>` tem scroll interno).
