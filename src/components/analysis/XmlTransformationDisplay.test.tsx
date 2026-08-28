import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { transformationService } from '../../services/api/transformationService';
import { xmlAnalysisService } from '../../services/api/xmlAnalysisService';
import { useAppStore } from '../../store/useAppStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import type { TransformationCandidatesResponse } from '../../types/transformation';
import { useAiFallbackPolling } from '../../hooks/useAiFallbackPolling';
import type { UseAiFallbackPollingResult } from '../../hooks/useAiFallbackPolling';
import XmlTransformationDisplay from './XmlTransformationDisplay';

vi.mock('../../services/api/transformationService', () => ({
  transformationService: {
    executeTransformationCandidates: vi.fn(),
  },
}));

vi.mock('../../hooks/useAiFallbackPolling', () => ({
  useAiFallbackPolling: vi.fn(),
}));

vi.mock('../../services/api/logService', () => ({
  logService: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/api/xmlAnalysisService', () => ({
  DiagnoseValidationErrorException: class DiagnoseValidationErrorException extends Error {
    readonly status = 500;
  },
  xmlAnalysisService: {
    diagnoseValidationError: vi.fn(),
  },
}));

const rawXml = '<root><value>123</value></root>';
const candidatesResponse: TransformationCandidatesResponse = {
  success: true,
  candidates: [
    {
      candidateId: 'tclxsl-1',
      pathway: 'tcl-xsl',
      transformedXml: rawXml,
      score: null,
      segmentMappings: {},
      validation: null,
      failureReason: null,
    },
  ],
  recommendedCandidateId: null,
  warnings: [],
};

const originalSecureContext = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

const idleAiFallbackResult: UseAiFallbackPollingResult = {
  status: null,
  candidate: null,
  diagnostics: null,
  error: null,
};

const fallbackTicketResponse: TransformationCandidatesResponse = {
  success: true,
  candidates: [],
  recommendedCandidateId: null,
  warnings: [
    'Nenhum candidato de transformação encontrado para o layout Layout NFe: fallback automático de IA enfileirado (ticket ticket-abc-123), consulte o status em segundo plano.',
  ],
};

describe('XmlTransformationDisplay', () => {
  beforeEach(() => {
    vi.mocked(useAiFallbackPolling).mockReturnValue(idleAiFallbackResult);
    useAppStore.getState().reset();
    useTransformationStore.getState().reset();
    useAppStore.getState().setSelectedLayout({
      layoutGuid: '00000000-0000-0000-0000-000000000000',
      name: 'Layout NFe',
    });
    useAppStore.getState().setTxtContent('DOCUMENTO-BRUTO');
    useAppStore.getState().setParseResult({
      success: true,
      layout: {
        layoutGuid: 'LAY_parse-guid-123',
        layoutType: '2',
        name: 'Layout NFe',
        description: 'Layout de teste',
        limitOfCaracters: 600,
        elements: [],
      },
    });
    useAppStore.setState({
      parsedDocumentProvenance: {
        document: {
          name: 'entrada.txt',
          originalSize: 15,
          lastModified: 123,
          encoding: 'utf-8',
        },
        layout: {
          layoutGuid: '00000000-0000-0000-0000-000000000000',
          name: 'Layout NFe',
        },
      },
    });
  });

  afterEach(() => {
    if (originalSecureContext) {
      Object.defineProperty(window, 'isSecureContext', originalSecureContext);
    } else {
      Reflect.deleteProperty(window, 'isSecureContext');
    }

    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }

    if (originalCreateObjectUrl) {
      Object.defineProperty(URL, 'createObjectURL', originalCreateObjectUrl);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }

    if (originalRevokeObjectUrl) {
      Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectUrl);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });

  it('envia o contrato completo com prioridade para o layoutGuid do parse', async () => {
    vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
      candidatesResponse
    );

    render(<XmlTransformationDisplay />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

    await waitFor(() =>
      expect(transformationService.executeTransformationCandidates).toHaveBeenCalledWith({
        inputContent: 'DOCUMENTO-BRUTO',
        layoutName: 'Layout NFe',
        layoutGuid: 'LAY_parse-guid-123',
        sourceDocumentType: '',
        targetDocumentType: '',
        validate: true,
        expectedOutput: '',
      })
    );

    const tree = screen.getByRole('tree', { name: 'Árvore do XML transformado' });
    expect(within(tree).getByRole('treeitem', { name: '<root>' })).toBeInTheDocument();
    // A árvore começa colapsada: o filho só aparece após expandir o nó raiz.
    expect(within(tree).queryByRole('treeitem', { name: /value/ })).not.toBeInTheDocument();
    fireEvent.click(
      within(tree).getByRole('treeitem', { name: '<root>' }).querySelector('.xml-tree-toggle')!
    );
    fireEvent.click(
      within(tree).getByRole('treeitem', { name: '<value>' }).querySelector('.xml-tree-toggle')!
    );
    expect(within(tree).getByText('123')).toBeInTheDocument();
  });

  it('copia o XML bruto, sem a indentação usada apenas na tela', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
      candidatesResponse
    );

    render(<XmlTransformationDisplay />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));
    await screen.findByRole('button', { name: 'Copiar XML' });
    fireEvent.click(screen.getByRole('button', { name: 'Copiar XML' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(rawXml));
    expect(screen.getByRole('status')).toHaveTextContent(
      'XML bruto copiado para a área de transferência.'
    );
  });

  it('baixa o XML bruto com MIME, nome sanitizado e revogação da URL temporária', async () => {
    let deliveredBlob: Blob | undefined;
    const createObjectURL = vi.fn((blob: Blob) => {
      deliveredBlob = blob;
      return 'blob:xml-transformado';
    });
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
      candidatesResponse
    );

    render(<XmlTransformationDisplay />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));
    await screen.findByRole('button', { name: 'Baixar XML' });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar XML' }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(deliveredBlob).toBeDefined();
    if (!deliveredBlob) {
      throw new Error('O Blob do download não foi criado.');
    }
    const downloadedBlob = deliveredBlob;
    expect(downloadedBlob.type).toBe('application/xml');
    const downloadedXml = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result)));
      reader.addEventListener('error', () => reject(reader.error));
      reader.readAsText(downloadedBlob);
    });
    expect(downloadedXml).toBe(rawXml);
    const clickedAnchor = anchorClick.mock.instances[0] as HTMLAnchorElement;
    expect(clickedAnchor?.download).toBe('Layout-NFe-tclxsl-1.xml');
    expect(clickedAnchor?.href).toBe('blob:xml-transformado');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:xml-transformado');
  });

  it('apresenta erro quando o navegador recusa copiar o XML', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permissão de clipboard negada.'));
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
      candidatesResponse
    );

    render(<XmlTransformationDisplay />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Copiar XML' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Permissão de clipboard negada');
  });

  it('apresenta erro quando o navegador não consegue iniciar o download', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('Falha ao criar URL temporária.');
      }),
    });
    vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
      candidatesResponse
    );

    render(<XmlTransformationDisplay />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Baixar XML' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao criar URL temporária');
  });

  it('seleciona o candidato com falha e exibe o diagnóstico retornado pela IA', async () => {
    vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue({
      success: true,
      candidates: [
        {
          ...candidatesResponse.candidates[0]!,
          candidateId: 'tcl-xsl-primeiro',
        },
        {
          ...candidatesResponse.candidates[0]!,
          candidateId: 'sysmiddle-12345678-abcd',
          pathway: 'sysmiddle',
          failureReason: 'Elemento obrigatório ausente.',
        },
      ],
      recommendedCandidateId: null,
      warnings: [],
    });
    vi.mocked(xmlAnalysisService.diagnoseValidationError).mockResolvedValue({
      success: true,
      diagnostic: {
        summary: 'O mapper não gerou a identificação da nota.',
        suggestedFix: 'Revise a regra que preenche infNFe/@Id.',
        confidence: 0.82,
      },
    });

    render(<XmlTransformationDisplay />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));
    const sysmiddleTab = await screen.findByRole('tab', { name: /Sysmiddle/ });
    fireEvent.click(sysmiddleTab);
    fireEvent.click(screen.getByRole('button', { name: 'Diagnosticar erro com IA' }));

    await waitFor(() =>
      expect(xmlAnalysisService.diagnoseValidationError).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: 'Elemento obrigatório ausente.' })
      )
    );
    const diagnostic = await screen.findByRole('region', { name: 'Diagnóstico de IA' });
    expect(diagnostic).toHaveTextContent('O mapper não gerou a identificação da nota.');
    expect(diagnostic).toHaveTextContent('Revise a regra que preenche infNFe/@Id.');
  });

  it('encerra o loading e apresenta falha de infraestrutura', async () => {
    vi.mocked(transformationService.executeTransformationCandidates).mockRejectedValue(
      new Error('API indisponível')
    );

    render(<XmlTransformationDisplay />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('API indisponível');
    expect(screen.getByRole('button', { name: 'Gerar Transformação XML' })).toBeEnabled();
    expect(useTransformationStore.getState().isLoadingCandidates).toBe(false);
  });

  it('explica separadamente por que Sysmiddle e TCL/XSL não geraram candidatos', async () => {
    vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue({
      success: true,
      candidates: [],
      recommendedCandidateId: null,
      warnings: [
        'Nenhum mapeador low-code encontrado para o layout Layout NFe (pathway sysmiddle)',
        'Candidato tcl-xsl falhou: XSL não encontrado para o layout',
        'Nenhum candidato de transformação encontrado para o layout Layout NFe',
      ],
    });

    render(<XmlTransformationDisplay />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

    const diagnostic = await screen.findByRole('region', {
      name: 'Nenhum candidato foi encontrado',
    });
    const sysmiddle = within(diagnostic).getByRole('region', {
      name: 'Diagnóstico Sysmiddle',
    });
    const tclXsl = within(diagnostic).getByRole('region', {
      name: 'Diagnóstico TCL/XSL',
    });

    expect(sysmiddle).toHaveTextContent(
      'Nenhum mapeador low-code encontrado para o layout Layout NFe'
    );
    expect(tclXsl).toHaveTextContent('Candidato tcl-xsl falhou: XSL não encontrado');
    expect(diagnostic).not.toHaveTextContent(
      'Nenhum candidato de transformação encontrado para o layout Layout NFe'
    );
  });

  describe('fallback automático de IA (aiFallback)', () => {
    it('exibe o aviso de execução em segundo plano quando status é running', async () => {
      vi.mocked(useAiFallbackPolling).mockReturnValue({
        status: 'running',
        candidate: null,
        diagnostics: null,
        error: null,
      });
      vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
        fallbackTicketResponse
      );

      render(<XmlTransformationDisplay />);
      fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

      const region = await screen.findByRole('region', { name: 'Fallback automático de IA' });
      expect(region).toHaveTextContent('A IA está gerando uma sugestão de transformação');
    });

    it('exibe erro sem detalhe quando status é failed sem lastError', async () => {
      vi.mocked(useAiFallbackPolling).mockReturnValue({
        status: 'failed',
        candidate: null,
        diagnostics: null,
        error: null,
      });
      vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
        fallbackTicketResponse
      );

      render(<XmlTransformationDisplay />);
      fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

      const region = await screen.findByRole('region', { name: 'Fallback automático de IA' });
      expect(within(region).getByRole('alert')).toHaveTextContent('A geração via IA falhou.');
    });

    it('exibe erro com lastError quando status é failed com diagnostics.lastError', async () => {
      vi.mocked(useAiFallbackPolling).mockReturnValue({
        status: 'failed',
        candidate: null,
        diagnostics: {
          iterations: 3,
          remainingDiffs: 0,
          xsdValid: false,
          lastError: 'XSD inválido: elemento obrigatório ausente',
          hasGroundTruth: false,
        },
        error: null,
      });
      vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
        fallbackTicketResponse
      );

      render(<XmlTransformationDisplay />);
      fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

      const region = await screen.findByRole('region', { name: 'Fallback automático de IA' });
      expect(within(region).getByRole('alert')).toHaveTextContent(
        'A geração via IA falhou: XSD inválido: elemento obrigatório ausente'
      );
    });

    it('exibe mensagem quando status é not-applicable', async () => {
      vi.mocked(useAiFallbackPolling).mockReturnValue({
        status: 'not-applicable',
        candidate: null,
        diagnostics: null,
        error: null,
      });
      vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
        fallbackTicketResponse
      );

      render(<XmlTransformationDisplay />);
      fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

      const region = await screen.findByRole('region', { name: 'Fallback automático de IA' });
      expect(region).toHaveTextContent('não conseguiu propor uma transformação aplicável');
    });

    it('exibe mensagem quando status é not-found', async () => {
      vi.mocked(useAiFallbackPolling).mockReturnValue({
        status: 'not-found',
        candidate: null,
        diagnostics: null,
        error: null,
      });
      vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
        fallbackTicketResponse
      );

      render(<XmlTransformationDisplay />);
      fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

      const region = await screen.findByRole('region', { name: 'Fallback automático de IA' });
      expect(region).toHaveTextContent('O ticket do fallback de IA não foi encontrado');
    });

    it('renderiza o candidato sugerido pela IA quando status é converged, com badge de sugestão sem gabarito', async () => {
      vi.mocked(useAiFallbackPolling).mockReturnValue({
        status: 'converged',
        candidate: {
          candidateId: 'ia-1',
          pathway: 'ia',
          transformedXml: rawXml,
          score: null,
          segmentMappings: null,
          validation: null,
          failureReason: null,
        },
        diagnostics: {
          iterations: 5,
          remainingDiffs: 0,
          xsdValid: true,
          lastError: null,
          hasGroundTruth: false,
        },
        error: null,
      });
      vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
        fallbackTicketResponse
      );

      render(<XmlTransformationDisplay />);
      fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

      const candidateRegion = await screen.findByRole('region', {
        name: 'Sugestão de transformação gerada por IA',
      });
      expect(candidateRegion).toHaveTextContent('Sugestão de IA — requer revisão humana');
      const tree = within(candidateRegion).getByRole('tree', {
        name: 'Árvore do XML transformado',
      });
      expect(within(tree).getByRole('treeitem', { name: '<root>' })).toBeInTheDocument();
    });

    it('renderiza badge de validado quando converged com hasGroundTruth true', async () => {
      vi.mocked(useAiFallbackPolling).mockReturnValue({
        status: 'converged',
        candidate: {
          candidateId: 'ia-1',
          pathway: 'ia',
          transformedXml: rawXml,
          score: null,
          segmentMappings: null,
          validation: null,
          failureReason: null,
        },
        diagnostics: {
          iterations: 2,
          remainingDiffs: 0,
          xsdValid: true,
          lastError: null,
          hasGroundTruth: true,
        },
        error: null,
      });
      vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
        fallbackTicketResponse
      );

      render(<XmlTransformationDisplay />);
      fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

      const candidateRegion = await screen.findByRole('region', {
        name: 'Sugestão de transformação gerada por IA',
      });
      expect(candidateRegion).toHaveTextContent('Validado contra gabarito');
      expect(candidateRegion).not.toHaveTextContent('requer revisão humana');
    });

    it('exibe o banner de erro de polling quando aiFallback.error está presente', async () => {
      vi.mocked(useAiFallbackPolling).mockReturnValue({
        status: 'running',
        candidate: null,
        diagnostics: null,
        error: 'Erro de rede ao consultar status da IA',
      });
      vi.mocked(transformationService.executeTransformationCandidates).mockResolvedValue(
        fallbackTicketResponse
      );

      render(<XmlTransformationDisplay />);
      fireEvent.click(screen.getByRole('button', { name: 'Gerar Transformação XML' }));

      const region = await screen.findByRole('region', { name: 'Fallback automático de IA' });
      expect(region).toHaveTextContent(
        'Falha ao consultar o status da IA, tentando novamente em segundo plano: Erro de rede ao consultar status da IA'
      );
    });
  });
});
