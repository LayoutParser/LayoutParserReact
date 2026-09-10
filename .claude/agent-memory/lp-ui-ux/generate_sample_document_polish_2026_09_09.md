---
name: generate-sample-document-polish
description: Refino de UI/UX do GenerateSampleDocumentButton (#238-#241) — padrão de ações de entrega e foco automático reaproveitado do XmlTransformationDisplay.
metadata:
  type: project
---

Em 2026-09-09 refinei `src/components/analysis/GenerateSampleDocumentButton/` (implementado pelo
`@lp-front-dev`) sem tocar lógica/estado: só CSS, markup de apresentação e acessibilidade.

Mudanças:
- CSS trocado de cores hardcoded (`#666`, `#b3261e` etc.) para os tokens já usados em
  `XmlTransformationDisplay.css` (`--color-danger-bg`, `--spacing-*`, `--radius-md`,
  `--focus-ring`, `--control-height` etc.) — mesmo vocabulário visual do resto da aba de análise.
- Ações "Copiar documento"/"Baixar documento" reaproveitando `copyTextToClipboard` e
  `createXmlFileName` de `src/utils/xmlDelivery.ts` (mesmo utilitário do XML, adaptando a
  extensão para `.txt` já que aqui é o TXT de amostra, não XML) — não criei um novo utilitário.
- Foco automático via `useRef`+`useEffect` movendo o foco de teclado para o bloco de
  erro/resultado ao concluir (`tabIndex={-1}` + `.focus()`), replicando o problema comum de
  "estado mudou mas quem navega por teclado/leitor de tela não percebe".
- Spinner puramente decorativo (`aria-hidden`, respeita `prefers-reduced-motion`) ao lado do
  texto "Gerando..." — texto continua sendo a fonte de verdade do estado.
- Estado idle (antes de qualquer clique) ganhou uma dica textual (`generate-sample-document-hint`)
  sem reintroduzir gate nenhum — o botão continua sempre visível/habilitado, decisão documentada
  no comentário JSDoc do componente (ver [[xml_transformation_feature]]).

Gates rodados: lint, typecheck, format:check (só memórias de outro agente com issue
pré-existente, não relacionado), vitest full suite (371/371) e suíte específica do componente
(6/6, ampliada com 2 testes novos: foco no erro e foco+ações no sucesso).
