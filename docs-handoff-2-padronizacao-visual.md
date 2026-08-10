# Handoff 2/3 — Padronização visual do front-end

> Para uma sessão nova de Claude Code, repo `LayoutParserReact`. Escrito por `@lp-architect`
> (Aria, do repo `LayoutParserApi`) a pedido do dono do projeto, 2026-07-31, depois de investigar
> o estado real do CSS deste repositório. Agentes sugeridos: `@lp-ui-ux` (Nina) para o sistema de
> tokens, `@lp-front-dev` (Remy) para aplicar nos componentes, `@lp-qa` (Quinn) para o gate.
>
> **Leia primeiro `.claude/CLAUDE.md` e `.claude/rules/frontend-standards.md` deste repo** — eles
> definem a persona dos agentes e os padrões de código já em vigor. Este documento não substitui
> aquilo, complementa com o que falta especificamente de padronização visual.

## O que já foi decidido, e nunca foi implementado

Existe uma decisão registrada (memória de `@lp-architect`, 2026-07-18,
`ndd-frontend-visual-reference`): a nova seção de análise/admin do `LayoutParserReact` deveria
adotar o visual do portal real da NDD (`ndd-frontend`, Angular, codinome "Nigéria") — **fonte
Raleway** e a paleta observada visualmente do portal rodando — sem virar um micro-frontend
Angular (o app continua Vite+React, só copia a aparência).

**Verificado nesta sessão que isso nunca foi aplicado:**

- `grep -rn "font-family" src --include="*.css"` não retorna **nenhuma** ocorrência de
  `Raleway` no projeto inteiro — só `monospace`/`'Courier New'` em componentes de exibição de
  campo.
- `src/index.css` tem só **5** propriedades CSS customizadas (`--var`) — não há sistema de
  tokens de cor/espaçamento centralizado.
- **22 arquivos `.css`** têm cor em hexadecimal direto (`#RRGGBB`), cada componente com sua
  própria paleta implícita.
- Os componentes de admin/painel que mais importam visualmente para a apresentação à diretoria
  (`src/components/admin/AdminPage.tsx`, `MonitoringTab.tsx`, `LayoutValidationTab.tsx`, e
  `src/components/aiMetrics/AiMetricsPanel.tsx`) têm cada um seu `.css` isolado, sem tokens
  compartilhados.

Ou seja: a decisão existe, a implementação não. Este handoff é fechar essa lacuna.

## Limite conhecido — não tente extrair tokens exatos do NDK

Os valores reais de design (cores, espaçamentos) do `ndd-frontend` vivem em pacotes npm privados
(`@ndk/nigeria/styles/variables`, `@ndk/theme-default`) que **não estão instalados** nesse
checkout — não há como extrair os valores exatos direto do source sem acesso ao registry privado
da NDD. O que é visível e replicável sem essas dependências:

- Fonte: **Raleway** — confirmada em `ndd-frontend/global-styles/client/src/raleway/_style.scss`
  (esse repo, se disponível localmente como repositório irmão `../ndd-frontend`, pode
  ser consultado só para essa fonte, não para os tokens).
- Base: **Bootstrap 5.2.3** (grid/espaçamento geral) + **Kendo UI** para grids — não precisa
  adotar essas libs aqui, só o _look_ (cantos, sombras, densidade).
- Overrides de tema em `ndd-frontend/global-styles/client/src/themes/main-nigeria.scss`.

**Se você tem acesso a rodar o portal `ndd-frontend` de verdade**, inspecionar via DevTools é o
caminho mais confiável para pegar a paleta exata (cor primária, cor de fundo, cor de texto,
cor de estado — sucesso/erro/pendente). **Se não tiver**, use uma paleta neutra profissional
plausível (tons de azul/cinza corporativo) e documente explicitamente que é aproximação, não
extração — não invente que é "a cor exata da NDD" se não foi verificada visualmente.

## Item 1 — Criar o sistema de tokens (design tokens em CSS custom properties)

Centralize em `src/index.css` (ou um novo `src/styles/tokens.css` importado por ele), no mínimo:

```css
:root {
  --font-family-base: 'Raleway', system-ui, sans-serif;

  --color-primary: /* cor principal do NDD, ver limite acima */;
  --color-bg: /* fundo de página */;
  --color-surface: /* fundo de card/painel */;
  --color-text: /* texto principal */;
  --color-text-muted: /* texto secundário */;
  --color-border: /* bordas de card/input */;

  --color-success: /* estado sucesso — usado no painel de métricas de IA para xsdValido/cypressValidado=true */;
  --color-danger: /* estado erro/rejeição */;
  --color-pending: /* estado "não avaliado ainda" — IMPORTANTE, ver Item 2 */;

  --radius-sm: ...;
  --radius-md: ...;
  --spacing-xs: ...;
  --spacing-sm: ...;
  --spacing-md: ...;
  --spacing-lg: ...;
}
```

Importe a fonte Raleway (Google Fonts via `<link>` no `index.html`, ou `@font-face` local se
houver política de não depender de CDN externo — confira se o projeto já tem alguma restrição
disso antes de escolher).

## Item 2 — Estado "pendente" precisa de tratamento visual consistente

Isto é um contrato de domínio, não só estética — leia com atenção. O painel de métricas de IA
(`AiMetricsPanel.tsx`) consome campos que vêm `null` do backend (`xsdValido`, `cypressValidado`,
`cStatPollux`) enquanto etapas do pipeline de IA→validação não estiverem cabeadas. O contrato
(`docs/architecture/handoff-frontend-gap-3-painel-ia-metrics.md`, no repo `LayoutParserApi`) é
explícito: **`null` significa "ainda não avaliado", nunca "falhou"**. Um badge vermelho em
`null` é uma leitura errada dos dados e, numa apresentação à diretoria, comunicaria o oposto do
que é verdade (fracasso em vez de "próxima etapa do roadmap").

Ao aplicar os tokens, confirme que os 3 estados (`null`/`true`/`false`) desses campos têm cores
visualmente distintas: `--color-pending` (neutro, cinza) para `null`, `--color-success` para
`true`, `--color-danger` para `false`. Audite `AiMetricsPanel.tsx`/`.css` — se hoje ele já trata
isso certo, só alinhe as cores aos tokens novos; se não trata, é bug de contrato, corrija.

## Item 3 — Aplicar os tokens nos componentes existentes

Ordem de prioridade (visual mais exposto primeiro — é o que aparece na apresentação de sábado):

1. `src/components/aiMetrics/AiMetricsPanel.tsx` + `.css`
2. `src/components/admin/AdminPage.tsx`, `MonitoringTab.tsx`, `LayoutValidationTab.tsx`
3. `src/layouts/MainLayout.tsx` (navbar/shell — dá o tom visual do app inteiro)
4. Os demais (`analysis/*`, `upload/*`, `shared/Button.css`/`Modal.css`/`Tabs.css`)

Não precisa reescrever CSS do zero — troque valores hardcoded (`#hex`, `font-family` ausente)
pelas variáveis do Item 1. Onde não houver equivalente óbvio, adicione o token que falta em vez
de inventar um valor novo solto no componente — é assim que a padronização se mantém no futuro.

## Item 4 — Dívida técnica já documentada neste repo (não é nova, mas relevante)

De `.claude/rules/frontend-standards.md`, seção "Pendências conhecidas":

- IP de produção hardcoded em `src/services/api.ts` e `vite.config.ts`
  (ambiente interno da API) — use sempre same-origin `/api` e confirme se
  `api.ts`/`vite.config.ts` de fato leem a env var ou se ainda têm o IP como fallback/literal
  duro. Se for só fallback de dev, ok; se for o valor usado em produção mesmo com a env var
  presente, é bug — corrija para usar a env var de verdade.
- Sem suite de testes — proposta já registrada: **Vitest + React Testing Library**. Não é
  escopo obrigatório deste handoff (é sobre visual), mas se sobrar tempo depois do Item 3, um
  teste de snapshot/smoke nos componentes tocados evita regressão visual futura.
- `any` residual em alguns pontos de `services`/tipos — fora de escopo aqui, mencionado só para
  não ser redescoberto como se fosse novo.

## Antes de terminar

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run format:check
```

Valide visualmente com `npm run dev` — não há testes automatizados de UI ainda, então a validação
manual é a única rede de segurança hoje. Veja especialmente o painel de métricas de IA com os 3
estados de `xsdValido`/`cypressValidado` (`null`/`true`/`false`) — se não houver dado real
disponível, force os 3 casos manualmente no DevTools ou peça mock ao `@lp-front-dev`.

Commits Conventional, PT-BR. **Não faça `git push`** — autoridade exclusiva de `@lp-devops` deste
repo. Peça o gate final a `@lp-qa`.
