import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParseRequestError, parseService } from '../../services/api';
import { layoutService } from '../../services/api/layoutService';
import { useAppStore } from '../../store/useAppStore';
import { useSessionStore } from '../../store/useSessionStore';
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

const alternateLayout = {
  layoutGuid: 'layout-guid-2',
  name: 'Layout Alternativo',
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
    useSessionStore.getState().reset();
    useTransformationStore.getState().reset();
    vi.mocked(layoutService.searchLayouts).mockResolvedValue({
      success: true,
      layouts: [layout],
    });
  });

  it('não renderiza "Atualizar Layout" para sessão sem função admin', () => {
    render(<LayoutParserPage />);
    expect(screen.queryByRole('button', { name: /Atualizar Layout/ })).not.toBeInTheDocument();
  });

  it('renderiza "Atualizar Layout" desabilitado para admin até haver busca bem-sucedida', async () => {
    useSessionStore.setState({ isAdmin: true });
    render(<LayoutParserPage />);

    const refreshButton = screen.getByRole('button', { name: 'Atualizar Layout' });
    expect(refreshButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Buscar Layout' }));
    await screen.findByRole('combobox', { name: 'Selecionar Layout' });

    expect(refreshButton).toBeEnabled();
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
      parsedDocumentProvenance: {
        document: { name: 'documento.txt' },
        layout: { layoutGuid: 'layout-guid-1', name: 'Layout Faculdade' },
      },
    });
    expect(screen.getByText(/Resultado vinculado a/)).toHaveTextContent(
      'documento.txt · 11 bytes · layout Layout Faculdade'
    );
  });

  it('invalida resultado e transformação ao trocar o layout processado', async () => {
    vi.mocked(layoutService.searchLayouts).mockResolvedValue({
      success: true,
      layouts: [layout, alternateLayout],
    });
    vi.mocked(parseService.parseFiles).mockResolvedValue({
      success: true,
      text: '001CONTEUDO',
      fields: [],
    });

    render(<LayoutParserPage />);
    await selectLayoutAndFile();
    fireEvent.click(screen.getByRole('button', { name: 'Processar Documento' }));
    await screen.findByText('Resultado de análise carregado');
    useTransformationStore.setState({
      hasEvaluatedCandidates: true,
      candidates: [
        {
          candidateId: 'tclxsl-1',
          pathway: 'tcl-xsl',
          transformedXml: '<root />',
          score: null,
          segmentMappings: {},
          validation: null,
          failureReason: null,
        },
      ],
    });

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /Layout Alternativo/ }));

    expect(useAppStore.getState()).toMatchObject({
      selectedLayout: alternateLayout,
      parseResult: null,
      parsedDocumentProvenance: null,
    });
    expect(useTransformationStore.getState()).toMatchObject({
      hasEvaluatedCandidates: false,
      candidates: [],
    });
    expect(screen.queryByText('Resultado de análise carregado')).not.toBeInTheDocument();
  });

  it('preserva edições até confirmação explícita da troca de arquivo', async () => {
    vi.mocked(parseService.parseFiles).mockResolvedValue({
      success: true,
      text: '001CONTEUDO',
      fields: [],
    });

    render(<LayoutParserPage />);
    await selectLayoutAndFile();
    fireEvent.click(screen.getByRole('button', { name: 'Processar Documento' }));
    await screen.findByText('Resultado de análise carregado');
    act(() => {
      useAppStore.setState({
        editHistory: [
          {
            fieldIndex: 0,
            lineIndex: 0,
            previousField: { lineName: 'LINHA001', fieldName: 'CNPJ', value: '1' },
            previousValue: '1',
            nextValue: '2',
          },
        ],
      });
    });

    const fileInput = document.querySelector<HTMLInputElement>('#txtFile');
    if (!fileInput) throw new Error('Input de arquivo não encontrado.');
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['OUTRO'], 'outro.txt', {
            type: 'text/plain',
            lastModified: 456,
          }),
        ],
      },
    });

    expect(screen.getByRole('dialog', { name: 'Descartar alterações pendentes?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Manter documento atual' }));
    expect(useAppStore.getState().parseResult).not.toBeNull();
    expect(screen.getByText('Resultado de análise carregado')).toBeInTheDocument();

    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['OUTRO'], 'outro.txt', {
            type: 'text/plain',
            lastModified: 456,
          }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Descartar e trocar' }));

    expect(useAppStore.getState()).toMatchObject({
      parseResult: null,
      parsedDocumentProvenance: null,
      editHistory: [],
    });
    expect(screen.getByText(/Arquivo selecionado: outro.txt/)).toBeInTheDocument();
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
