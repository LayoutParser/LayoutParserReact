import type { XmlSelectableNode } from './xmlTree';

/**
 * Valor observado de um nó selecionável, para pré-preencher o formulário de reporte de
 * divergência (Story #234). Nó texto/atributo tem `value` direto; elemento-folha usa
 * `textContent` (pode ser `null` quando o elemento existe mas está vazio).
 */
export const getObservedNodeValue = (node: XmlSelectableNode): string => {
  if (node.kind === 'text' || node.kind === 'attribute') return node.value;
  return node.textContent ?? '';
};
