import { create } from 'zustand';
import type {
  DiagnoseValidationErrorStatus,
  TransformationCandidate,
  ValidationDiagnostic,
} from '../types/transformation';

export type AnalysisMode = 'txt-posicional' | 'xml-transformacao';

interface DiagnosticError {
  status: DiagnoseValidationErrorStatus;
  message: string;
}

interface TransformationState {
  // Modo de análise ativo (aba selecionada em AnalysisModeTabs)
  activeMode: AnalysisMode | null;

  // Disponibilidade de transformação XML para o layout atual (via Mapper cadastrado).
  // null = ainda não verificado.
  mapperAvailable: boolean | null;
  isCheckingMapper: boolean;

  // Multi-candidato (POST /api/transformationexecution/execute-candidates)
  isLoadingCandidates: boolean;
  candidatesError: string | null;
  candidates: TransformationCandidate[];
  candidatesWarnings: string[];
  activeCandidateId: string | null; // seleção do usuário; null = usa o primeiro do array (sem ordenar por score)

  // Diagnóstico de erro via IA (POST /api/xml-analysis/diagnose-validation-error)
  // `isDiagnosing` é distinto de `isExecuting`/`isLoadingCandidates` porque a UI precisa
  // comunicar que esta chamada específica pode demorar muito (endpoint validado com ~150s de
  // latência em ambiente sem GPU) — ver XmlTransformationDisplay.
  isDiagnosing: boolean;
  diagnosticError: DiagnosticError | null;
  diagnostic: ValidationDiagnostic | null;

  setActiveMode: (mode: AnalysisMode | null) => void;
  setMapperAvailable: (available: boolean | null) => void;
  setCheckingMapper: (checking: boolean) => void;
  setLoadingCandidates: (loading: boolean) => void;
  setCandidatesError: (error: string | null) => void;
  setCandidatesResult: (candidates: TransformationCandidate[], warnings: string[]) => void;
  setActiveCandidateId: (candidateId: string | null) => void;

  setDiagnosing: (diagnosing: boolean) => void;
  setDiagnosticError: (error: DiagnosticError | null) => void;
  setDiagnostic: (diagnostic: ValidationDiagnostic | null) => void;

  reset: () => void;
}

const initialState = {
  activeMode: null,
  mapperAvailable: null,
  isCheckingMapper: false,
  isLoadingCandidates: false,
  candidatesError: null,
  candidates: [] as TransformationCandidate[],
  candidatesWarnings: [] as string[],
  activeCandidateId: null,

  isDiagnosing: false,
  diagnosticError: null,
  diagnostic: null,
};

// Estado do domínio "transformação XML" (mapper disponível? / resultado da transformação /
// candidatos / diagnóstico IA). Deriva `layoutGuid`/`inputContent` de useAppStore quando
// precisa decidir algo — não duplica esses campos aqui.
export const useTransformationStore = create<TransformationState>(set => ({
  ...initialState,

  setActiveMode: mode => set({ activeMode: mode }),
  setMapperAvailable: available => set({ mapperAvailable: available }),
  setCheckingMapper: checking => set({ isCheckingMapper: checking }),
  setLoadingCandidates: loading => set({ isLoadingCandidates: loading }),
  setCandidatesError: error => set({ candidatesError: error }),
  setCandidatesResult: (candidates, warnings) =>
    set({
      candidates,
      candidatesWarnings: warnings,
      // Sem ordenação por score (back-end ainda não preenche de verdade) — seleção padrão é
      // sempre o primeiro item do array, conforme handoff.
      activeCandidateId: candidates[0]?.candidateId ?? null,
    }),
  setActiveCandidateId: candidateId => set({ activeCandidateId: candidateId }),

  setDiagnosing: diagnosing => set({ isDiagnosing: diagnosing }),
  setDiagnosticError: error => set({ diagnosticError: error }),
  setDiagnostic: diagnostic => set({ diagnostic }),

  reset: () => set(initialState),
}));
