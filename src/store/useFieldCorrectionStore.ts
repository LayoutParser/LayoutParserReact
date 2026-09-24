import { create } from 'zustand';
import type { FieldCorrectionReport } from '../types/fieldCorrection';

/**
 * Chave composta candidato+nó: o mesmo xpath pode se repetir entre irmãos (ex.: itens de uma
 * lista), então a desambiguação usa `nodeId` (que já carrega a ocorrência), não só `fieldPath`.
 */
export const buildFieldCorrectionKey = (candidateId: string, nodeId: string): string =>
  `${candidateId}::${nodeId}`;

interface FieldCorrectionState {
  // Reportes de divergência pendentes, só em memória (sem persistência na API — ver
  // src/types/fieldCorrection.ts). Chave: buildFieldCorrectionKey(candidateId, nodeId).
  reportsByKey: Record<string, FieldCorrectionReport>;

  upsertReport: (report: FieldCorrectionReport) => void;
  getReport: (candidateId: string, nodeId: string) => FieldCorrectionReport | null;
  reset: () => void;
}

const initialState = {
  reportsByKey: {} as Record<string, FieldCorrectionReport>,
};

export const useFieldCorrectionStore = create<FieldCorrectionState>((set, get) => ({
  ...initialState,

  upsertReport: report =>
    set(state => ({
      reportsByKey: {
        ...state.reportsByKey,
        [buildFieldCorrectionKey(report.candidateId, report.nodeId)]: report,
      },
    })),

  getReport: (candidateId, nodeId) =>
    get().reportsByKey[buildFieldCorrectionKey(candidateId, nodeId)] ?? null,

  reset: () => set(initialState),
}));
