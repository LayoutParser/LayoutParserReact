---
name: design-system-conventions
description: Convenções visuais reais do LayoutParserReact — o que existe vs. o que é de fato usado. Checar antes de assumir.
metadata:
  type: project
---

## Base do design system
- `components/shared` tem **Button, Modal, Tabs**. `Modal` e `Tabs` são de fato usados.
  **`Button` existe mas não é usado em nenhuma tela** (upload/layout/analysis/admin usam
  `<button>` cru + classe CSS própria por tela: `.control-btn`, `.search-nav-btn`,
  `.xml-transformation-generate-btn` etc., cada uma com seu próprio gradiente). "Reuse Button
  antes de criar" é a regra documentada no CLAUDE.md, mas não reflete o código hoje — trocar
  um botão já existente pelo componente `Button` é uma padronização maior do que parece
  (mudaria a aparência visual estabelecida em produção), não um detalhe local; confirmar com
  o usuário antes de fazer isso em telas já existentes. Em componentes NOVOS, ainda vale a
  regra (usar `Button`/`Modal`/`Tabs` em vez de reinventar).
- **CSS por componente** (`Foo.css` ao lado do `Foo.tsx`). Evitar estilos globais novos
  (`index.css`/`App.css` só tem reset básico + paleta em `:root`, não crescer isso).
- Estados obrigatórios em telas assíncronas (loading/vazio/erro) já são hábito no código
  existente: `isSearching`/`isUploading` como texto no próprio botão ("Buscando...",
  "Processando..."), placeholders em itálico cinza, banners `.error-message` com `❌`.

## Cores de "erro" — não são intercambiáveis
- `#dc3545` (vermelho clássico, não está na paleta `:root`) = linha/campo estruturalmente
  inválido dentro de `FieldDisplay` (border-left + underline ondulado no campo problemático).
  É especificamente sobre a visualização "TXT Posicional" — é o "linhas inválidas em
  vermelho" citado na minha missão.
- `#ED008C` (`--color-rosa`, cor da marca) = banners de erro genéricos de ação/API
  (`.error-message`, `.xml-transformation-error`, estilo idêntico entre os dois) — mas
  também é usada como destaque normal (não-erro) em vários botões (submit, danger, toggle).
  Não assumir que todo elemento rosa da UI é "erro".

## Contraste — pontos fracos conhecidos (sistêmicos, não de 1 componente só)
- Texto "mudo"/placeholder: `#666` (~5.7:1, passa AA) e `#999` (~2.85:1, falha AA) são usados
  para o mesmo papel em componentes diferentes. Preferir `#666` em texto novo.
- Botões com `#ED008C` (sólido ou em gradiente com `#5700FF`) + texto branco ficam perto do
  limite AA (~4.2:1 do lado rosa, abaixo do mínimo 4.5:1 para texto normal). Aparece em
  `Button.tsx` (`.btn-danger`/`.btn-warning`), `.submit-btn` (LayoutParserPage) e outros CTAs.
  É sistêmico — não faz sentido corrigir isoladamente em um componente só (criaria
  inconsistência visual); é candidato a uma missão `a11y` dedicada revisando a paleta toda
  com o usuário, não a um fix pontual.

## Lacunas de acessibilidade conhecidas (ainda não corrigidas)
- `Tabs` compartilhado (`components/shared/Tabs.tsx`) não segue o padrão ARIA de tabs: sem
  `role="tablist"/"tab"`, sem `aria-selected`, sem navegação por setas do teclado. Em
  2026-07-20 o único consumidor era `AnalysisModeTabs`. Bom candidato a missão `a11y` futura
  — baixo risco de quebrar outros usos, já que hoje só tem um consumidor.
