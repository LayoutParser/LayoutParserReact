import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParseRequestError, parseService } from '../../services/api';
import { layoutService } from '../../services/api/layoutService';
import { useAppStore } from '../../store/useAppStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import LayoutParserPage from './LayoutParserPage';

vi.mock('../../services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    parseService: { parseFiles: vi.fn() },
  };
});

vi.mock('../../services/api/layoutService', () => ({
  layoutService: {
    searchLayouts: vi.fn(),
    refreshCache: vi.fn(),
  },
}));

vi.mock('../../services/api/logService', () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../analysis/AnalysisModeTabs', () => ({
  default: () => <div>Resultado de análise carregado</div>,
}));

const layout = {
  layoutGuid: 'layout-guid-1',
  name: 'Layout Faculdade',
  decryptedContent: '<layout />',
};

const selectLayoutAndFile = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Buscar Layout' }));
  await screen.findByRole('combobox', { name: 'Selecionar Layout' });

  fireEvent.click(screen.getByRole('combobox', { name: 'Selecionar Layout' }));
  fireEvent.click(screen.getByRole('option', { name: /Layout Faculdade/ }));

  const fileInput = document.querySelector<HTMLInputElement>('#txtFile');
  if (!fileInput) throw new Error('Input de arquivo não encontrado.');
  fireEvent.change(fileInput, {
    target: { files: [new File(['001CONTEUDO'], 'documento.txt', { type: 'text/plain' })] },
  });
};

describe('LayoutParserPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAppStore.getState().reset();
    useTransformationStore.getState().reset();
    vi.mocked(layoutService.searchLayouts).mockResolvedValue({
      success: true,
      layouts: [layout],
    });
  });

  it('executa o fluxo de catálogo, upload e parse com sucesso', async () => {
    vi.mocked(parseService.parseFiles).mockResolvedValue({
      success: true,
      text: '001CONTEUDO',
      fields: [
        {
          lineName: 'LINHA001',
          fieldName: 'Tipo',
          value: '001',
          lineSequence: '001',
        },
      ],
    });

    render(<LayoutParserPage />);
    await selectLayoutAndFile();
    fireEvent.click(screen.getByRole('button', { name: 'Processar Documento' }));

    await waitFor(() => expect(parseService.parseFiles).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Resultado de análise carregado')).toBeInTheDocument();
    expect(useAppStore.getState()).toMatchObject({
      txtContent: '001CONTEUDO',
      uploadError: null,
      parseError: null,
    });
  });

  it('remove o resultado anterior quando o documento seguinte falha', async () => {
    useAppStore.setState({
      parseResult: { success: true, text: 'ANTERIOR' },
      txtContent: 'ANTERIOR',
      fields: [{ lineName: 'A', fieldName: 'B', value: 'C' }],
    });
    vi.mocked(parseService.parseFiles).mockRejectedValue(
      new ParseRequestError({
        kind: 'parse_error',
        message: 'Documento inválido.',
        httpStatus: 422,
        failureCause: 'document_malformed',
      })
    );

    render(<LayoutParserPage />);
    await selectLayoutAndFile();
    fireEvent.click(screen.getByRole('button', { name: 'Processar Documento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Documento inválido.');
    expect(useAppStore.getState()).toMatchObject({
      parseResult: null,
      txtContent: '',
      fields: [],
    });
  });

  it('cancela o upload em andamento sem aplicar resultado novo', async () => {
    vi.mocked(parseService.parseFiles).mockImplementation(
      (_request, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Upload cancelado.', 'AbortError'));
          });
        })
    );

    render(<LayoutParserPage />);
    await selectLayoutAndFile();
    fireEvent.click(screen.getByRole('button', { name: 'Processar Documento' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar processamento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Processamento cancelado');
    expect(useAppStore.getState()).toMatchObject({
      parseResult: null,
      isUploading: false,
    });
  });
});
