import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { monitoringService } from '../../services/api/monitoringService';
import LayoutValidationTab from './LayoutValidationTab';
import MonitoringTab from './MonitoringTab';

vi.mock('../../services/api/monitoringService', () => ({
  monitoringService: {
    getLayoutValidations: vi.fn(),
    getLayoutsAnalysis: vi.fn(),
  },
}));

vi.mock('../../services/api/logService', () => ({
  logService: {
    error: vi.fn(),
  },
}));

describe('abas administrativas de monitoramento', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('carrega as validações sem atualizar estado sincronicamente no effect', async () => {
    vi.mocked(monitoringService.getLayoutValidations).mockResolvedValue({
      success: true,
      timestamp: '2026-08-10T00:00:00.000Z',
      summary: {
        totalLayouts: 0,
        validLayouts: 0,
        invalidLayouts: 0,
        totalErrors: 0,
        validationRate: 100,
      },
      validations: [],
    });

    render(<LayoutValidationTab />);

    expect(screen.getByText('Carregando validações de layouts...')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Validação de Layouts' })
    ).toBeInTheDocument();
    expect(monitoringService.getLayoutValidations).toHaveBeenCalledWith(false);
  });

  it('carrega a análise sem atualizar estado sincronicamente no effect', async () => {
    vi.mocked(monitoringService.getLayoutsAnalysis).mockResolvedValue({
      success: true,
      timestamp: '2026-08-10T00:00:00.000Z',
      summary: {
        totalLayouts: 0,
        validLayouts: 0,
        invalidLayouts: 0,
        layoutsWithErrors: 0,
        validationRate: 100,
      },
      layouts: [],
    });

    render(<MonitoringTab />);

    expect(screen.getByText('Carregando análise de layouts...')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Monitoramento de Layouts' })
    ).toBeInTheDocument();
    expect(monitoringService.getLayoutsAnalysis).toHaveBeenCalledOnce();
  });
});
