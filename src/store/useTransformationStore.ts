import { create } from 'zustand';
import type { TransformationExecutionResponse } from '../types/transformation';

export type AnalysisMode = 'txt-posicional' | 'xml-transformacao';

interface TransformationState {
  // Modo de análise ativo (aba selecionada em AnalysisModeTabs)
  activeMode: AnalysisMode | null;

  // Disponibilidade de transformação XML para o layout atual (via Mapper cadastrado).
  // null = ainda não verificado.
  mapperAvailable: boolean | null;
  isCheckingMapper: boolean;

  // Execução da transformação (POST /api/transformationexecution/execute)
  isExecuting: boolean;
  executionError: string | null;
  transformationResult: TransformationExecutionResponse | null;

  setActiveMode: (mode: AnalysisMode | null) => void;
  setMapperAvailable: (available: boolean | null) => void;
  setCheckingMapper: (checking: boolean) => void;
  setExecuting: (executing: boolean) => void;
  setExecutionError: (error: string | null) => void;
  setTransformationResult: (result: TransformationExecutionResponse | null) => void;
  reset: () => void;
}

const initialState = {
  activeMode: null,
  mapperAvailable: null,
  isCheckingMapper: false,
  isExecuting: false,
  executionError: null,
  transformationResult: null,
};

// Estado do domínio "transformação XML" (mapper disponível? / resultado da transformação).
// Deriva `layoutGuid`/`inputContent` de useAppStore quando precisa decidir algo — não duplica
// esses campos aqui.
export const useTransformationStore = create<TransformationState>(set => ({
  ...initialState,

  setActiveMode: mode => set({ activeMode: mode }),
  setMapperAvailable: available => set({ mapperAvailable: available }),
  setCheckingMapper: checking => set({ isCheckingMapper: checking }),
  setExecuting: executing => set({ isExecuting: executing }),
  setExecutionError: error => set({ executionError: error }),
  setTransformationResult: result => set({ transformationResult: result }),

  reset: () => set(initialState),
}));
