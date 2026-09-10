import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import GenerateSampleDocumentButton from './GenerateSampleDocumentButton';

vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const axiosError = (status: number): unknown => {
  const error = new Error(`Request failed with status code ${status}`) as Error & {
    isAxiosError: true;
    response: { status: number };
  };
  error.isAxiosError = true;
  error.response = { status };
  return error;
};

const setLoadedDocument = (overrides: Partial<{ layoutType: string; layoutGuid: string }> = {}) => {
  useAppStore.getState().setSelectedLayout(
    {
      layoutGuid: overrides.layoutGuid ?? 'LAY_guid-123',
      name: 'Layout de teste',
      layoutType: overrides.layoutType ?? 'TextPositional',
    },
    'manual'
  );
  useAppStore.getState().setParseResult({ success: true });
};

describe('GenerateSampleDocumentButton', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    vi.clearAllMocks();
    vi.spyOn(axios, 'isAxiosError').mockImplementation(
      (value: unknown): value is import('axios').AxiosError =>
        typeof value === 'object' &&
        value !== null &&
        (value as { isAxiosError?: boolean }).isAxiosError === true
    );
  });

  it('não renderiza nada sem layout/parse bem-sucedido', () => {
    render(<GenerateSampleDocumentButton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('exibe o botão também para layout Xml, agora que o endpoint cobre ambos os formatos', () => {
    setLoadedDocument({ layoutType: 'Xml' });
    render(<GenerateSampleDocumentButton />);
    expect(screen.getByRole('button', { name: 'Gerar documento de exemplo' })).toBeEnabled();
  });

  // Decisão (course-correction do coordenador): não existe no contrato nenhum campo real que
  // diga "layout tem mapper TCL/XSL/XSLT vinculado" — nem acoplamos à avaliação prévia de
  // `execute-candidates`, que esconderia o botão sem motivo aparente para o usuário. O botão
  // fica sempre visível; é a resposta do endpoint (404 `no_mapper`) quem decide, tratada como
  // erro amigável abaixo.
  it('sempre exibe o botão para layout TextPositional, mesmo sem avaliação prévia de candidatos', () => {
    setLoadedDocument();
    render(<GenerateSampleDocumentButton />);
    expect(screen.getByRole('button', { name: 'Gerar documento de exemplo' })).toBeEnabled();
  });

  it('trata o 404 (no_mapper) do endpoint como mensagem amigável', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(axiosError(404));
    setLoadedDocument();
    render(<GenerateSampleDocumentButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Gerar documento de exemplo' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('TCL/XSL/XSLT'));
  });

  it('exibe o documento gerado em caso de sucesso, com ações de copiar/baixar, e move o foco para o resultado', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { generatedDocument: 'HDR000001EXEMPLO0001', format: 'positional', warnings: [] },
    });
    setLoadedDocument();
    render(<GenerateSampleDocumentButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Gerar documento de exemplo' }));

    const result = await screen.findByRole('status', { name: '' });
    await waitFor(() => expect(result).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Copiar documento' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar documento' })).toBeInTheDocument();
  });

  it('move o foco para a mensagem de erro ao falhar', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(axiosError(404));
    setLoadedDocument();
    render(<GenerateSampleDocumentButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Gerar documento de exemplo' }));

    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert).toHaveFocus());
  });
});
