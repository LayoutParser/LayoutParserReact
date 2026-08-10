import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ParseErrorBanner from './ParseErrorBanner';

describe('ParseErrorBanner', () => {
  it('apresenta defeito interno sem induzir investigação do arquivo', () => {
    render(
      <ParseErrorBanner
        error={{
          kind: 'parse_error',
          message: 'Exceção não tratada',
          httpStatus: 422,
          failureCause: 'parser_defect',
          detectedType: 'idoc',
          correlationId: 'corr-123',
        }}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Falha interna ao processar o documento');
    expect(screen.getByText('corr-123')).toBeInTheDocument();
    expect(screen.queryByText('Tipo detectado')).not.toBeInTheDocument();
    expect(screen.queryByText('idoc')).not.toBeInTheDocument();
  });

  it('indica explicitamente quando o XML do layout é o artefato inválido', () => {
    render(
      <ParseErrorBanner
        error={{
          kind: 'parse_error',
          message: 'Layout ilegível',
          httpStatus: 422,
          failureCause: 'layout_invalid',
          detectedType: 'mqseries',
        }}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('O XML do layout não pôde ser lido');
    expect(screen.getByText('Tipo detectado')).toBeInTheDocument();
    expect(screen.getByText('mqseries')).toBeInTheDocument();
  });

  it('mostra orientação de conectividade para erro de rede', () => {
    render(<ParseErrorBanner error={{ kind: 'network_error', message: 'Falha de conexão' }} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Sem comunicação com a API');
    expect(screen.getByRole('alert')).toHaveTextContent('Verifique sua conexão');
  });
});
