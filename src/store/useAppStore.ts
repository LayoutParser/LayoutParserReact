import { create } from 'zustand';
import type { ParseErrorInfo, ParseResponse, Field } from '../types/api';
import type { Layout } from '../types/layout';
import {
  applyPositionalFieldEdit,
  type PositionalFieldEditResult,
  type PositionalFieldTarget,
} from '../utils/positionalFieldEdit';

interface AppState {
  // Estado de upload
  isUploading: boolean;
  uploadProgress: number;
  // Mensagens de VALIDAÇÃO LOCAL do formulário ("selecione um layout"). Natureza diferente de
  // uma falha de API — misturar as duas num campo só é o que costuma gerar estado preso.
  uploadError: string | null;
  // Falha da chamada de parse já CLASSIFICADA (422 x 5xx x rede). Ver ParseRequestError.
  parseError: ParseErrorInfo | null;

  // Resultado do parsing
  parseResult: ParseResponse | null;
  txtContent: string;
  fields: Field[];

  // Layout selecionado
  selectedLayout: Layout | null;

  // Ações
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setUploadError: (error: string | null) => void;
  setParseError: (error: ParseErrorInfo | null) => void;
  setParseResult: (result: ParseResponse | null) => void;
  setTxtContent: (content: string) => void;
  setFields: (fields: Field[]) => void;
  setSelectedLayout: (layout: Layout | null) => void;
  editPositionalField: (
    target: PositionalFieldTarget,
    nextValue: string
  ) => PositionalFieldEditResult;
  reset: () => void;
}

const initialState = {
  isUploading: false,
  uploadProgress: 0,
  uploadError: null,
  parseError: null,
  parseResult: null,
  txtContent: '',
  fields: [],
  selectedLayout: null,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setUploading: uploading => set({ isUploading: uploading }),
  setUploadProgress: progress => set({ uploadProgress: progress }),
  setUploadError: error => set({ uploadError: error }),
  setParseError: error => set({ parseError: error }),
  setParseResult: result => set({ parseResult: result }),
  setTxtContent: content => set({ txtContent: content }),
  setFields: fields => set({ fields }),
  setSelectedLayout: layout => set({ selectedLayout: layout }),
  editPositionalField: (target, nextValue) => {
    const state = get();
    const sourceFields = state.fields.length > 0 ? state.fields : (state.parseResult?.fields ?? []);
    const sourceField = sourceFields[target.fieldIndex];
    if (sourceField !== target.field) {
      throw new Error('O campo selecionado mudou. Selecione-o novamente antes de editar.');
    }

    const result = applyPositionalFieldEdit(state.txtContent, target, nextValue);
    const updatedFields = sourceFields.map((field, index) =>
      index === target.fieldIndex ? result.field : field
    );

    set({
      txtContent: result.content,
      fields: updatedFields,
      parseResult: state.parseResult
        ? { ...state.parseResult, text: result.content, fields: updatedFields }
        : state.parseResult,
    });
    return result;
  },

  reset: () => set(initialState),
}));
