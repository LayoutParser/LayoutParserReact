import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logService } from '../../services/api/logService';
import AppErrorBoundary from './AppErrorBoundary';

vi.mock('../../services/api/logService', () => ({
  logService: { error: vi.fn() },
}));

const BrokenComponent = () => {
  throw new Error('conteúdo que não pode vazar');
};

describe('AppErrorBoundary', () => {
  const preventJsdomReport = (event: ErrorEvent) => event.preventDefault();

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.addEventListener('error', preventJsdomReport);
  });

  afterEach(() => {
    window.removeEventListener('error', preventJsdomReport);
  });

  it('preserva o conteúdo quando não há falha', () => {
    render(
      <AppErrorBoundary>
        <p>Aplicação funcionando</p>
      </AppErrorBoundary>
    );

    expect(screen.getByText('Aplicação funcionando')).toBeInTheDocument();
  });

  it('mostra recuperação segura e registra apenas metadados', () => {
    render(
      <AppErrorBoundary>
        <BrokenComponent />
      </AppErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível continuar');
    expect(screen.getByRole('button', { name: 'Recarregar aplicação' })).toBeInTheDocument();
    expect(logService.error).toHaveBeenCalledWith(
      'Falha inesperada na interface do LayoutParser',
      expect.objectContaining({ errorName: 'Error' })
    );
    expect(JSON.stringify(vi.mocked(logService.error).mock.calls)).not.toContain(
      'conteúdo que não pode vazar'
    );
  });
});
