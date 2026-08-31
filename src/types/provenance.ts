import type { DocumentEncoding } from '../utils/documentEncoding';

export type LayoutSelectionSource = 'manual' | 'auto_unique' | 'ranked_candidate';

export interface LayoutDetectionProvenance {
  selectionSource: LayoutSelectionSource;
  correlationId?: string;
  algorithmVersion?: string;
  catalogVersion?: string;
  candidateRank?: number;
  matchScore?: number;
}

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
  /** Metadados auditáveis disponíveis no front, sem copiar o conteúdo do documento. */
  detection?: LayoutDetectionProvenance;
}
