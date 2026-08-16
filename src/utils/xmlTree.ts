/**
 * Converte uma string XML em uma árvore de nós navegável, usando o `DOMParser` nativo do
 * navegador (zero dependência nova). Front é só apresentação: nenhuma regra de domínio é
 * inferida aqui — apenas a estrutura literal do XML retornado pela API.
 */

export interface XmlAttributeNode {
  id: string;
  kind: 'attribute';
  name: string;
  value: string;
}

export interface XmlElementNode {
  id: string;
  kind: 'element';
  name: string;
  attributes: XmlAttributeNode[];
  children: XmlElementNode[];
  /** Texto direto do elemento, só quando ele não tem filhos-elemento (senão seria whitespace de indentação). */
  textContent: string | null;
}

export interface ParsedXmlTree {
  root: XmlElementNode | null;
  error: string | null;
}

/**
 * Monta o id do nó a partir do caminho de ocorrência entre irmãos de mesma tag (ex.:
 * `/NFe[0]/det[2]/prod[0]`). Convenção alinhada à proposta de `xmlNodeOccurrence` em
 * `docs/proposals/txt-xml-linked-navigation.md`, para que um vínculo TXT↔XML futuro (PBI
 * bloqueado) possa reaproveisar os mesmos ids sem precisar remontar a árvore.
 */
const buildElementNode = (element: Element, nodeId: string): XmlElementNode => {
  const attributes: XmlAttributeNode[] = Array.from(element.attributes).map(attr => ({
    id: `${nodeId}/@${attr.name}`,
    kind: 'attribute',
    name: attr.name,
    value: attr.value,
  }));

  const childElements = Array.from(element.children);
  const siblingOccurrences = new Map<string, number>();
  const children: XmlElementNode[] = childElements.map(child => {
    const occurrence = siblingOccurrences.get(child.tagName) ?? 0;
    siblingOccurrences.set(child.tagName, occurrence + 1);
    return buildElementNode(child, `${nodeId}/${child.tagName}[${occurrence}]`);
  });

  // Elemento com filhos-elemento: o textContent do DOM incluiria os textos dos filhos também,
  // então só é tratado como "texto próprio" quando o elemento é folha.
  let textContent: string | null = null;
  if (childElements.length === 0) {
    const text = element.textContent?.trim();
    textContent = text ? text : null;
  }

  return {
    id: nodeId,
    kind: 'element',
    name: element.tagName,
    attributes,
    children,
    textContent,
  };
};

export const parseXmlToTree = (xml: string): ParsedXmlTree => {
  if (!xml || !xml.trim()) {
    return { root: null, error: null };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  // O `DOMParser` do browser não lança exceção em XML malformado: ele devolve um documento
  // contendo um nó `<parsererror>` — é assim que detectamos a falha.
  const parserError = doc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    return {
      root: null,
      error:
        parserError.textContent?.trim() ||
        'XML inválido: não foi possível interpretar a estrutura.',
    };
  }

  const rootElement = doc.documentElement;
  if (!rootElement || rootElement.nodeName === 'parsererror') {
    return { root: null, error: 'XML vazio: nenhum elemento raiz encontrado.' };
  }

  return { root: buildElementNode(rootElement, `/${rootElement.tagName}[0]`), error: null };
};
