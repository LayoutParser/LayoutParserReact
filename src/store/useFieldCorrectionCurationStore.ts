import { create } from 'zustand';
import { fieldCorrectionCurationService } from '../services/api/fieldCorrectionCurationService';
import type {
  FieldCorrectionDecision,
  FieldCorrectionReport,
} from '../types/fieldCorrectionCuration';

type QueueStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Estado de revisão por item, além do `status` já devolvido pela API (evita nova store por item). */
type ReviewingState = Record<string, boolean>;

interface FieldCorrectionCurationState {
  status: QueueStatus;
  reports: FieldCorrectionReport[];
  reviewing: ReviewingState;
  error: string | null;
  loadPending: () => Promise<void>;
  decide: (reportId: string, decision: FieldCorrectionDecision) => Promise<void>;
  reset: () => void;
}

const initialState = {
  status: 'idle' as QueueStatus,
  reports: [] as FieldCorrectionReport[],
  reviewing: {} as ReviewingState,
  error: null as string | null,
};

export const useFieldCorrectionCurationStore = create<FieldCorrectionCurationState>((set, get) => ({
  ...initialState,

  loadPending: async () => {
    if (get().status === 'loading') {
      return;
    }

    set({ status: 'loading', error: null });
    try {
      const reports = await fieldCorrectionCurationService.getPending();
      set({ status: 'ready', reports, error: null });
    } catch (error) {
      set({
        status: 'error',
        reports: [],
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar a fila de correções de campo.',
      });
    }
  },

  decide: async (reportId, decision) => {
    const current = get().reports.find(report => report.reportId === reportId);
    // Item já revisado ou requisição em andamento: não permite nova decisão (evita divergência
    // por retry de rede ou duplo clique — critério de idempotência da Story #244).
    if (!current || current.status !== 'pending' || get().reviewing[reportId]) {
      return;
    }

    set(state => ({ reviewing: { ...state.reviewing, [reportId]: true } }));
    try {
      // A API responde só { reportId, status } — merge parcial no item existente, nunca
      // substitui o relatório inteiro (a resposta não traz fieldPath/observedValue/etc.).
      const { status } = await fieldCorrectionCurationService.review(reportId, decision);
      set(state => ({
        reports: state.reports.map(report =>
          report.reportId === reportId ? { ...report, status } : report
        ),
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível registrar a decisão sobre este item.',
      });
    } finally {
      set(state => {
        const rest = { ...state.reviewing };
        delete rest[reportId];
        return { reviewing: rest };
      });
    }
  },

  reset: () => set(initialState),
}));
