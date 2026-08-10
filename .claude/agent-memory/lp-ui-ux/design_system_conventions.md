---
name: design-system-conventions
description: Convenções visuais vigentes e baseline acessível do LayoutParser Web.
metadata:
  type: project
---

# Convenções visuais vigentes

- CSS permanece ao lado do componente; `src/index.css` contém apenas fundações e adaptações
  globais de acessibilidade/responsividade.
- Use superfícies claras, hierarquia tipográfica, bordas suaves e cores da marca com contraste
  suficiente; rosa não deve ser o único indicador de erro.
- Todo controle interativo precisa de foco visível e alvo mínimo próximo de 44 px.
- Fluxos assíncronos têm loading, vazio, erro e sucesso perceptíveis; progresso de upload e
  cancelamento não podem deslocar a tela abruptamente.
- O layout em L vira uma coluna em telas estreitas; tabelas/abas podem rolar internamente sem
  criar overflow horizontal da página.
- Preserve `prefers-reduced-motion`, alto contraste, safe areas e viewport dinâmica em modais.
- `Button`, `Modal` e `Tabs` compartilhados devem ser considerados antes de novo markup, mas
  migração visual de componentes existentes exige validação proporcional ao impacto.
- `Tabs` e árvores devem manter semântica ARIA e navegação por teclado; não aceite apenas
  aparência moderna como gate de UX.
