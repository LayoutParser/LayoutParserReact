import { create } from 'zustand';
import type { ParseResponse, Field } from '../types/api';

interface AppState {
  // Estado de upload
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  
  // Resultado do parsing
  parseResult: ParseResponse | null;
  txtContent: string;
  fields: Field[];
  
  // Ações
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setUploadError: (error: string | null) => void;
  setParseResult: (result: ParseResponse | null) => void;
  setTxtContent: (content: string) => void;
  setFields: (fields: Field[]) => void;
  reset: () => void;
}

const initialState = {
  isUploading: false,
  uploadProgress: 0,
  uploadError: null,
  parseResult: null,
  txtContent: '',
  fields: [],
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  
  setUploading: (uploading) => set({ isUploading: uploading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setUploadError: (error) => set({ uploadError: error }),
  setParseResult: (result) => set({ parseResult: result }),
  setTxtContent: (content) => set({ txtContent: content }),
  setFields: (fields) => set({ fields }),
  
  reset: () => set(initialState),
}));

