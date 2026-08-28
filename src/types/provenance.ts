import type { DocumentEncoding } from '../utils/documentEncoding';

/**
 * Identidade imutável dos insumos que produziram o parse atualmente exibido.
 * Conteúdo e secrets não são duplicados aqui: apenas dados suficientes para impedir que
 * resultado, edição ou transformação sejam associados a outro arquivo/layout por engano.
 */
export interface ParsedDocumentProvenance {
  document: {
    name: string;
    originalSize: number;
    lastModified: number;
    encoding: DocumentEncoding;
  };
  layout: {
    layoutGuid: string;
    name: string;
    version?: string;
  };
}
