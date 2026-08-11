import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { transformationService } from '../../services/api/transformationService';
import { useAppStore } from '../../store/useAppStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import type { TransformationCandidatesResponse } from '../../types/transformation';
import XmlTransformationDisplay from './XmlTransformationDisplay';

vi.mock('../../services/api/transformationService', () => ({
  transformationService: {
    executeTransformationCandidates: vi.fn(),
  },
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

describe('XmlTransformationDisplay', () => {
  beforeEach(() => {
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

    expect(screen.getByRole('textbox', { name: 'Conteúdo XML transformado' })).toHaveValue(
      ['<root>', '  <value>123</value>', '</root>'].join('\n')
    );
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
});
