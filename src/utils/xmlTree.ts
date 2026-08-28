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
  xpath: string;
  xpathOccurrence: number;
  parentId: string;
}

export interface XmlTextNode {
  id: string;
  kind: 'text';
  name: '#text';
  value: string;
  xpath: string;
  xpathOccurrence: number;
  parentId: string;
}

export interface XmlElementNode {
  id: string;
  kind: 'element';
  name: string;
  xpath: string;
  xpathOccurrence: number;
  parentId: string | null;
  attributes: XmlAttributeNode[];
  children: XmlElementNode[];
  textNode: XmlTextNode | null;
  /** Texto direto do elemento, só quando ele não tem filhos-elemento (senão seria whitespace de indentação). */
  textContent: string | null;
}

export interface ParsedXmlTree {
  root: XmlElementNode | null;
  error: string | null;
}

export type XmlSelectableNode = XmlElementNode | XmlAttributeNode | XmlTextNode;

interface BuildContext {
  namespacePrefixes: Map<string, string>;
  xpathOccurrences: Map<string, number>;
}

const getQualifiedName = (node: Element | Attr, context: BuildContext): string => {
  const localName = node.localName || node.nodeName;
  const namespacePrefix = node.namespaceURI
    ? context.namespacePrefixes.get(node.namespaceURI)
    : undefined;
  const prefix = namespacePrefix ?? node.prefix;
  return prefix ? `${prefix}:${localName}` : node.nodeName;
};

const nextXpathOccurrence = (xpath: string, context: BuildContext): number => {
  const occurrence = (context.xpathOccurrences.get(xpath) ?? 0) + 1;
  context.xpathOccurrences.set(xpath, occurrence);
  return occurrence;
};

/**
 * Monta o id do nó a partir do caminho de ocorrência entre irmãos de mesma tag (ex.:
 * `/NFe[0]/det[2]/prod[0]`). Convenção alinhada à proposta de `xmlNodeOccurrence` em
 * `docs/proposals/txt-xml-linked-navigation.md`, para que um vínculo TXT↔XML futuro (PBI
 * bloqueado) possa reaproveisar os mesmos ids sem precisar remontar a árvore.
 */
const buildElementNode = (
  element: Element,
  nodeId: string,
  parentId: string | null,
  parentXpath: string,
  context: BuildContext
): XmlElementNode => {
  const qualifiedName = getQualifiedName(element, context);
  const xpath = `${parentXpath}/${qualifiedName}`;
  const xpathOccurrence = nextXpathOccurrence(xpath, context);
  const attributes: XmlAttributeNode[] = Array.from(element.attributes)
    .filter(attr => attr.namespaceURI !== 'http://www.w3.org/2000/xmlns/')
    .map(attr => {
      const attributeName = getQualifiedName(attr, context);
      return {
        id: `${nodeId}/@${attr.name}`,
        kind: 'attribute' as const,
        name: attr.name,
        value: attr.value,
        xpath: `${xpath}/@${attributeName}`,
        xpathOccurrence,
        parentId: nodeId,
      };
    });

  const childElements = Array.from(element.children);
  const siblingOccurrences = new Map<string, number>();
  const children: XmlElementNode[] = childElements.map(child => {
    const occurrence = siblingOccurrences.get(child.tagName) ?? 0;
    siblingOccurrences.set(child.tagName, occurrence + 1);
    return buildElementNode(
      child,
      `${nodeId}/${child.tagName}[${occurrence}]`,
      nodeId,
      xpath,
      context
    );
  });

  // Elemento com filhos-elemento: o textContent do DOM incluiria os textos dos filhos também,
  // então só é tratado como "texto próprio" quando o elemento é folha.
  let textContent: string | null = null;
  if (childElements.length === 0) {
    const text = element.textContent?.trim();
    textContent = text ? text : null;
  }

  const textNode: XmlTextNode | null = textContent
    ? {
        id: `${nodeId}/#text`,
        kind: 'text',
        name: '#text',
        value: textContent,
        xpath,
        xpathOccurrence,
        parentId: nodeId,
      }
    : null;

  return {
    id: nodeId,
    kind: 'element',
    name: element.tagName,
    xpath,
    xpathOccurrence,
    parentId,
    attributes,
    children,
    textNode,
    textContent,
  };
};

export const parseXmlToTree = (
  xml: string,
  xmlNamespaces: Record<string, string> = {}
): ParsedXmlTree => {
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

  const context: BuildContext = {
    namespacePrefixes: new Map(
      Object.entries(xmlNamespaces).map(([prefix, namespaceUri]) => [namespaceUri, prefix])
    ),
    xpathOccurrences: new Map(),
  };

  return {
    root: buildElementNode(rootElement, `/${rootElement.tagName}[0]`, null, '', context),
    error: null,
  };
};

export const flattenXmlTree = (root: XmlElementNode | null): XmlSelectableNode[] => {
  if (!root) return [];

  const nodes: XmlSelectableNode[] = [];
  const visit = (node: XmlElementNode) => {
    nodes.push(node, ...node.attributes);
    if (node.textNode) nodes.push(node.textNode);
    node.children.forEach(visit);
  };
  visit(root);
  return nodes;
};
