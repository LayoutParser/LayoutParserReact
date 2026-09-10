import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { MOCK_NO_MAPPER_LAYOUT_GUID } from '../../../services/api/sampleDocumentService';
import GenerateSampleDocumentButton from './GenerateSampleDocumentButton';

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
  });

  it('não renderiza nada sem layout/parse bem-sucedido', () => {
    render(<GenerateSampleDocumentButton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('mostra aviso de indisponibilidade para layout Xml, sem chamar o serviço', () => {
    setLoadedDocument({ layoutType: 'Xml' });
    render(<GenerateSampleDocumentButton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('ainda não está disponível');
  });

  // Decisão (course-correction do coordenador): não existe no contrato nenhum campo real que
  // diga "layout tem mapper TCL/XSL/XSLT vinculado" — nem acoplamos à avaliação prévia de
  // `execute-candidates`, que esconderia o botão sem motivo aparente para o usuário. O botão
  // fica sempre visível para layouts não-Xml; é a resposta do endpoint (404 `no_mapper`) quem
  // decide, tratada como erro amigável abaixo.
  it('sempre exibe o botão para layout TextPositional, mesmo sem avaliação prévia de candidatos', () => {
    setLoadedDocument();
    render(<GenerateSampleDocumentButton />);
    expect(screen.getByRole('button', { name: 'Gerar documento de exemplo' })).toBeEnabled();
  });

  it('trata o 404 (no_mapper) do endpoint como mensagem amigável', async () => {
    setLoadedDocument({ layoutGuid: MOCK_NO_MAPPER_LAYOUT_GUID });
    render(<GenerateSampleDocumentButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Gerar documento de exemplo' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('TCL/XSL/XSLT'));
  });

  it('exibe o documento gerado em caso de sucesso', async () => {
    setLoadedDocument();
    render(<GenerateSampleDocumentButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Gerar documento de exemplo' }));

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
  });
});
