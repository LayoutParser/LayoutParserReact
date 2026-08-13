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
