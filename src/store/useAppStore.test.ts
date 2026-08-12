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
