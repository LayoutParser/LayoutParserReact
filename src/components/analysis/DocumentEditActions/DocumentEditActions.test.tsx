import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseService } from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import { useTransformationStore } from '../../../store/useTransformationStore';
import type { Field } from '../../../types/field';
import DocumentEditActions from './DocumentEditActions';

vi.mock('../../../services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../services/api')>();
  return {
    ...actual,
    parseService: { parseFiles: vi.fn() },
  };
});

const field: Field = {
  lineName: 'LINHA001',
  fieldName: 'CNPJ',
  value: '12345678901234',
  startPosition: 1,
  length: 14,
};
const content = `${field.value}${' '.repeat(586)}`;

const prepareDocument = () => {
  useAppStore.setState({
    selectedLayout: {
      layoutGuid: 'layout-1',
      name: 'Layout Teste',
      decryptedContent: '<layout />',
    },
    txtContent: content,
    fields: [field],
    parseResult: { success: true, text: content, fields: [field] },
    documentSource: {
      name: 'entrada.txt',
      mediaType: 'text/plain',
      lastModified: 123,
      encoding: 'utf-8',
      hasBom: false,
      originalSize: 600,
    },
    parsedDocumentProvenance: {
      document: {
        name: 'entrada.txt',
        originalSize: 600,
        lastModified: 123,
        encoding: 'utf-8',
      },
      layout: {
        layoutGuid: 'layout-1',
        name: 'Layout Teste',
      },
    },
  });
};

describe('DocumentEditActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    useTransformationStore.getState().reset();
    prepareDocument();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:txt-editado'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('desfaz a última alteração somente em memória', () => {
    useAppStore
      .getState()
      .editPositionalField({ field, fieldIndex: 0, lineIndex: 0 }, '98765432109876');
    render(<DocumentEditActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer última alteração' }));

    expect(useAppStore.getState().txtContent).toBe(content);
    expect(useAppStore.getState().editHistory).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('Alteração de CNPJ desfeita');
  });

  it('baixa o TXT no encoding e tamanho originais', () => {
    render(<DocumentEditActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Baixar TXT editado' }));

    const file = vi.mocked(URL.createObjectURL).mock.calls[0]?.[0];
    expect(file).toBeInstanceOf(File);
    expect((file as File).size).toBe(600);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:txt-editado');
    expect(screen.getByRole('status')).toHaveTextContent('utf-8, com 600 bytes');
  });

  it('reenvia o TXT editado e substitui os estados derivados pela resposta da API', async () => {
    const revalidatedField = { ...field, isValid: false, errorMessage: 'CNPJ inválido' };
    vi.mocked(parseService.parseFiles).mockResolvedValue({
      success: true,
      text: content,
      fields: [revalidatedField],
      validationErrors: [
        {
          lineIndex: 0,
          sequence: '001',
          expectedLength: 600,
          actualLength: 600,
          errorMessage: 'CNPJ inválido',
          startPosition: 1,
          endPosition: 14,
        },
      ],
    });
    render(<DocumentEditActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Reprocessar e revalidar' }));

    await waitFor(() => expect(parseService.parseFiles).toHaveBeenCalledTimes(1));
    const request = vi.mocked(parseService.parseFiles).mock.calls[0]?.[0];
    expect(request?.txtFile).toBeInstanceOf(File);
    expect(request?.txtFile.size).toBe(600);
    expect(request?.layoutName).toBe('Layout Teste');
    expect(useAppStore.getState().fields[0]).toEqual(revalidatedField);
    expect(useAppStore.getState().parseResult?.validationErrors).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('1 erro(s) posicional(is)');
  });
});
