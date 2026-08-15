import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AuthenticationGate from './AuthenticationGate';

describe('AuthenticationGate', () => {
  it('oferece login Microsoft preservando somente o retorno local', () => {
    render(
      <AuthenticationGate
        status="unauthenticated"
        returnTo="/upload?layout=demo"
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: 'Entrar com Microsoft' })).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fupload%3Flayout%3Ddemo'
    );
    expect(screen.getByText(/Sua senha permanece com o provedor escolhido/i)).toBeVisible();
  });

  it('oferece login Google como alternativa, preservando somente o retorno local', () => {
    render(
      <AuthenticationGate
        status="unauthenticated"
        returnTo="/upload?layout=demo"
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /Entrar com Google/i })).toHaveAttribute(
      'href',
      '/auth/google/login?returnTo=%2Fupload%3Flayout%3Ddemo'
    );
  });

  it('traduz falha OIDC para uma mensagem segura', () => {
    render(
      <AuthenticationGate
        status="unauthenticated"
        returnTo="/upload"
        authError="invalid_callback"
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/expirou ou não pôde ser validada/i);
    expect(screen.queryByText('invalid_callback')).not.toBeInTheDocument();
  });

  it('mensagem de login_failed não presume qual provedor (Microsoft/Google) falhou', () => {
    // Regressão: o BFF registra a mesma rota de callback para Entra e Google e devolve o mesmo
    // authError=login_failed nos dois casos; a mensagem já citou só "Microsoft" e apareceu para
    // quem tentou entrar com Google.
    render(
      <AuthenticationGate
        status="unauthenticated"
        returnTo="/upload"
        authError="login_failed"
        onRetry={vi.fn()}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/não foi possível concluir a entrada/i);
    expect(alert).not.toHaveTextContent(/microsoft/i);
    expect(alert).not.toHaveTextContent(/google/i);
  });

  it('permite repetir a consulta quando o gateway está indisponível', () => {
    const onRetry = vi.fn();
    render(
      <AuthenticationGate
        status="error"
        returnTo="/upload"
        infrastructureError="Falha ao consultar o gateway."
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
