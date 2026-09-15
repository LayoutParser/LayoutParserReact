// Tipos para o reporte de divergência de campo por nó da árvore XML (Story #234).
//
// ⚠️ Nesta entrega o reporte fica em estado "pending" apenas LOCAL (Zustand) — não existe
// endpoint de escrita na API para persistir isso ainda. Quando o contrato de persistência for
// aberto, este tipo tende a virar o payload de um `services/fieldCorrectionService.ts` novo;
// até lá, é puramente estado de apresentação.

export type FieldCorrectionPathway = 'sysmiddle' | 'tcl-xsl';

/** Único status hoje — existe para já deixar o campo pronto para os estados futuros da API. */
export type FieldCorrectionStatus = 'pending';

export interface FieldCorrectionReport {
  /** Id interno do nó na árvore (`XmlSelectableNode.id`) — usado para desambiguar irmãos com o mesmo xpath. */
  nodeId: string;
  /** Xpath do campo, exibido ao usuário como "Campo (xpath)". */
  fieldPath: string;
  candidateId: string;
  pathway: FieldCorrectionPathway;
  correlationId: string | null;
  observedValue: string;
  expectedValue: string;
  justification: string;
  status: FieldCorrectionStatus;
  reportedAt: string;
  updatedAt: string;
}
