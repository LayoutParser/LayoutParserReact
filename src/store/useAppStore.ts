import { create } from 'zustand';
import type { ParseErrorInfo, ParseResponse, Field } from '../types/api';
import type { Layout } from '../types/layout';
import type { ParsedDocumentProvenance } from '../types/provenance';
import { assertEncodedReplacementSize, type DocumentSource } from '../utils/documentEncoding';
import {
  applyPositionalFieldEdit,
  inspectPositionalField,
  type PositionalFieldEditResult,
  type PositionalFieldTarget,
} from '../utils/positionalFieldEdit';

export interface PositionalEditHistoryEntry {
  fieldIndex: number;
  lineIndex: number;
  previousField: Field;
  previousValue: string;
  nextValue: string;
}

const MAX_EDIT_HISTORY = 50;

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
  documentSource: DocumentSource | null;
  parsedDocumentProvenance: ParsedDocumentProvenance | null;
  editHistory: PositionalEditHistoryEntry[];

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
  replaceParsedDocument: (
    result: ParseResponse,
    source: DocumentSource,
    provenance: ParsedDocumentProvenance
  ) => void;
  clearParsedDocument: () => void;
  editPositionalField: (
    target: PositionalFieldTarget,
    nextValue: string
  ) => PositionalFieldEditResult;
  undoLastPositionalEdit: () => PositionalFieldEditResult;
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
  documentSource: null as DocumentSource | null,
  parsedDocumentProvenance: null as ParsedDocumentProvenance | null,
  editHistory: [] as PositionalEditHistoryEntry[],
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
  replaceParsedDocument: (result, source, provenance) =>
    set({
      parseResult: result,
      txtContent: result.text ?? '',
      fields: result.fields ?? [],
      documentSource: source,
      parsedDocumentProvenance: provenance,
      editHistory: [],
      parseError: null,
      uploadError: null,
    }),
  clearParsedDocument: () =>
    set({
      parseResult: null,
      txtContent: '',
      fields: [],
      documentSource: null,
      parsedDocumentProvenance: null,
      editHistory: [],
    }),
  editPositionalField: (target, nextValue) => {
    const state = get();
    const sourceFields = state.fields.length > 0 ? state.fields : (state.parseResult?.fields ?? []);
    const sourceField = sourceFields[target.fieldIndex];
    if (sourceField !== target.field) {
      throw new Error('O campo selecionado mudou. Selecione-o novamente antes de editar.');
    }

    const inspection = inspectPositionalField(state.txtContent, target);
    if (!inspection.editable) {
      throw new Error(inspection.reason);
    }

    if (state.documentSource) {
      assertEncodedReplacementSize(
        inspection.currentValue,
        nextValue,
        state.documentSource.encoding
      );
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
      editHistory: [
        ...state.editHistory.slice(-(MAX_EDIT_HISTORY - 1)),
        {
          fieldIndex: target.fieldIndex,
          lineIndex: target.lineIndex,
          previousField: { ...sourceField },
          previousValue: inspection.currentValue,
          nextValue,
        },
      ],
    });
    return result;
  },
  undoLastPositionalEdit: () => {
    const state = get();
    const historyEntry = state.editHistory[state.editHistory.length - 1];
    if (!historyEntry) {
      throw new Error('Não há alteração para desfazer.');
    }

    const sourceFields = state.fields.length > 0 ? state.fields : (state.parseResult?.fields ?? []);
    const currentField = sourceFields[historyEntry.fieldIndex];
    if (!currentField) {
      throw new Error('O campo alterado não existe mais. Reprocesse o documento.');
    }

    const result = applyPositionalFieldEdit(
      state.txtContent,
      {
        field: currentField,
        fieldIndex: historyEntry.fieldIndex,
        lineIndex: historyEntry.lineIndex,
      },
      historyEntry.previousValue
    );
    const restoredField = { ...historyEntry.previousField };
    const updatedFields = sourceFields.map((field, index) =>
      index === historyEntry.fieldIndex ? restoredField : field
    );

    set({
      txtContent: result.content,
      fields: updatedFields,
      parseResult: state.parseResult
        ? { ...state.parseResult, text: result.content, fields: updatedFields }
        : state.parseResult,
      editHistory: state.editHistory.slice(0, -1),
    });

    return { ...result, field: restoredField };
  },

  reset: () => set(initialState),
}));
