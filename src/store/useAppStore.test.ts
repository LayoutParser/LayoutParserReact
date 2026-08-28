import { beforeEach, describe, expect, it } from 'vitest';

import type { Field } from '../types/field';
import { useAppStore } from './useAppStore';

const field: Field = {
  lineName: 'LINHA001',
  fieldName: 'CNPJ',
  value: '12345678901234',
  startPosition: 1,
  length: 14,
};

describe('useAppStore.editPositionalField', () => {
  beforeEach(() => useAppStore.getState().reset());

  it('atualiza TXT, fields e parseResult de forma atômica', () => {
    const content = `${field.value}${' '.repeat(586)}`;
    useAppStore.setState({
      txtContent: content,
      fields: [field],
      parseResult: { success: true, text: content, fields: [field] },
    });

    useAppStore
      .getState()
      .editPositionalField({ field, fieldIndex: 0, lineIndex: 0 }, '98765432109876');

    const state = useAppStore.getState();
    expect(state.txtContent).toHaveLength(content.length);
    expect(state.txtContent.startsWith('98765432109876')).toBe(true);
    expect(state.fields[0]?.value).toBe('98765432109876');
    expect(state.parseResult?.text).toBe(state.txtContent);
    expect(state.parseResult?.fields?.[0]?.value).toBe('98765432109876');
    expect(state.editHistory).toHaveLength(1);
  });

  it('desfaz a última edição e restaura conteúdo e metadados do campo', () => {
    const content = `${field.value}${' '.repeat(586)}`;
    useAppStore.setState({
      txtContent: content,
      fields: [field],
      parseResult: { success: true, text: content, fields: [field] },
    });

    useAppStore
      .getState()
      .editPositionalField({ field, fieldIndex: 0, lineIndex: 0 }, '98765432109876');
    useAppStore.getState().undoLastPositionalEdit();

    const state = useAppStore.getState();
    expect(state.txtContent).toBe(content);
    expect(state.fields[0]).toEqual(field);
    expect(state.parseResult?.fields?.[0]).toEqual(field);
    expect(state.editHistory).toHaveLength(0);
  });

  it('recusa edição que mudaria o tamanho em bytes do encoding original', () => {
    const encodedField: Field = {
      lineName: 'LINHA001',
      fieldName: 'UF',
      value: 'AA',
      startPosition: 1,
      length: 2,
    };
    const content = `AA${' '.repeat(598)}`;
    useAppStore.setState({
      txtContent: content,
      fields: [encodedField],
      parseResult: { success: true, text: content, fields: [encodedField] },
      documentSource: {
        name: 'entrada.txt',
        mediaType: 'text/plain',
        lastModified: 0,
        encoding: 'utf-8',
        hasBom: false,
        originalSize: 600,
      },
    });

    expect(() =>
      useAppStore
        .getState()
        .editPositionalField({ field: encodedField, fieldIndex: 0, lineIndex: 0 }, 'áA')
    ).toThrow('mesmo tamanho no encoding original');
    expect(useAppStore.getState().txtContent).toBe(content);
  });

  it('recusa uma seleção obsoleta sem alterar o estado', () => {
    const content = `${field.value}${' '.repeat(586)}`;
    useAppStore.setState({
      txtContent: content,
      fields: [{ ...field }],
      parseResult: { success: true, text: content, fields: [{ ...field }] },
    });

    expect(() =>
      useAppStore
        .getState()
        .editPositionalField({ field, fieldIndex: 0, lineIndex: 0 }, '98765432109876')
    ).toThrow('campo selecionado mudou');
    expect(useAppStore.getState().txtContent).toBe(content);
  });
});

describe('useAppStore.proveniência', () => {
  beforeEach(() => useAppStore.getState().reset());

  it('grava e remove de forma atômica a origem do resultado processado', () => {
    const source = {
      name: 'entrada.txt',
      mediaType: 'text/plain',
      lastModified: 123,
      encoding: 'utf-8' as const,
      hasBom: false,
      originalSize: 14,
    };
    const provenance = {
      document: {
        name: 'entrada.txt',
        originalSize: 14,
        lastModified: 123,
        encoding: 'utf-8' as const,
      },
      layout: {
        layoutGuid: 'layout-1',
        name: 'Layout Teste',
      },
    };

    useAppStore
      .getState()
      .replaceParsedDocument({ success: true, text: '12345678901234' }, source, provenance);

    expect(useAppStore.getState().parsedDocumentProvenance).toEqual(provenance);
    useAppStore.getState().clearParsedDocument();
    expect(useAppStore.getState()).toMatchObject({
      parseResult: null,
      documentSource: null,
      parsedDocumentProvenance: null,
    });
  });
});
