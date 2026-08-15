import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import AnalysisModeTabs from './AnalysisModeTabs';

vi.mock('./FieldDisplay', () => ({ default: () => <div>Campos posicionais</div> }));
vi.mock('./StructureTree', () => ({ default: () => <div>Árvore estrutural</div> }));
vi.mock('./XmlTransformationDisplay', () => ({
  default: () => <div>Avaliação multi-candidato</div>,
}));

const setSuccessfulParse = (
  transformationsStatus: 'completed' | 'processing' | 'not_applicable' | 'error',
  transformationsReason?: 'no_mapper'
) => {
  useAppStore.getState().setParseResult({
    success: true,
    transformationsStatus,
    transformationsReason,
    layout: {
      layoutGuid: 'LAY_parse-guid-123',
      layoutType: '2',
      name: 'Layout Fiscal',
      description: 'Layout de teste',
      limitOfCaracters: 600,
      elements: [],
    },
  });
};

describe('AnalysisModeTabs', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useTransformationStore.getState().reset();
  });

  it('remove a orientação de background e mantém a avaliação multi-candidato acessível', () => {
    setSuccessfulParse('processing');

    render(<AnalysisModeTabs />);

    expect(screen.getByRole('tab', { name: 'XML Transformação Final' })).toBeVisible();
    expect(
      screen.queryByText(/continua sendo processada em segundo plano/i)
    ).not.toBeInTheDocument();
  });

  it('não usa a ausência de mapper Sysmiddle para bloquear a avaliação TCL\/XSL', () => {
    setSuccessfulParse('not_applicable', 'no_mapper');

    render(<AnalysisModeTabs />);

    expect(screen.getByRole('tab', { name: 'XML Transformação Final' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sysmiddle: nenhum mapeador low-code cadastrado para este layout.'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'O caminho TCL/XSL ainda pode ser avaliado'
    );
  });

  it('apresenta a edição do TXT antes da árvore de estrutura na aba TXT Posicional', () => {
    setSuccessfulParse('not_applicable');

    render(<AnalysisModeTabs />);

    const campos = screen.getByText('Campos posicionais');
    const arvore = screen.getByText('Árvore estrutural');

    // compareDocumentPosition indica DOCUMENT_POSITION_FOLLOWING quando `arvore` vem DEPOIS de
    // `campos` no DOM — ou seja, edição do TXT em cima, estrutura hierárquica embaixo.
    expect(campos.compareDocumentPosition(arvore) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
