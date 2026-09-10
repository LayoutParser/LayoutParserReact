import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FieldDivergenceModal from './FieldDivergenceModal';
import type { FieldCorrectionReport } from '../../types/fieldCorrection';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  fieldPath: '/NFe[0]/ide[0]/cUF',
  observedValue: '35',
  pathwayLabel: 'TCL/XSL',
  candidateId: 'tclxsl-1',
  correlationId: 'corr-123',
  existingReport: null as FieldCorrectionReport | null,
  onSubmit: vi.fn(),
};

describe('FieldDivergenceModal', () => {
  it('exibe os dados somente-leitura do nó (xpath, valor observado, candidato, correlationId)', () => {
    render(<FieldDivergenceModal {...baseProps} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('/NFe[0]/ide[0]/cUF')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText(/TCL\/XSL/)).toBeInTheDocument();
    expect(screen.getByText('tclxsl-1')).toBeInTheDocument();
    expect(screen.getByText('corr-123')).toBeInTheDocument();
  });

  it('bloqueia o envio sem valor esperado, com erro acessível e foco no campo', () => {
    const handleSubmit = vi.fn();
    render(<FieldDivergenceModal {...baseProps} onSubmit={handleSubmit} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Registrar divergência' }));

    expect(handleSubmit).not.toHaveBeenCalled();
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Informe o valor esperado para reportar a divergência.');
    const field = screen.getByLabelText(/Valor esperado/);
    expect(field).toHaveAttribute('aria-describedby', error.id);
    expect(field).toHaveAttribute('aria-invalid', 'true');
  });

  it('confirma com valor esperado preenchido e envia dados trimados', () => {
    const handleSubmit = vi.fn();
    render(<FieldDivergenceModal {...baseProps} onSubmit={handleSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Valor esperado/), {
      target: { value: '  36  ' },
    });
    fireEvent.change(screen.getByLabelText(/Justificativa/), {
      target: { value: '  Divergência de UF  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar divergência' }));

    expect(handleSubmit).toHaveBeenCalledWith({
      expectedValue: '36',
      justification: 'Divergência de UF',
    });
  });

  it('abre em modo edição pré-preenchido quando já existe um reporte para o nó', () => {
    const existingReport: FieldCorrectionReport = {
      nodeId: 'node-1',
      fieldPath: '/NFe[0]/ide[0]/cUF',
      candidateId: 'tclxsl-1',
      pathway: 'tcl-xsl',
      correlationId: 'corr-123',
      observedValue: '35',
      expectedValue: '36',
      justification: 'Já reportado antes',
      status: 'pending',
      reportedAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    render(
      <FieldDivergenceModal
        {...baseProps}
        existingReport={existingReport}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Editar divergência de campo' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Valor esperado/)).toHaveValue('36');
    expect(screen.getByLabelText(/Justificativa/)).toHaveValue('Já reportado antes');
    expect(screen.getByRole('button', { name: 'Atualizar reporte' })).toBeInTheDocument();
  });
});
