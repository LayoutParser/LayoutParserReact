import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import HomePage from './HomePage';

describe('HomePage', () => {
  it('oferece login Microsoft e Google preservando o retorno local', () => {
    render(
      <MemoryRouter>
        <HomePage returnTo="/upload" />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Entrar com Microsoft' })).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fupload'
    );
    expect(screen.getByRole('link', { name: /Entrar com Google/i })).toHaveAttribute(
      'href',
      '/auth/google/login?returnTo=%2Fupload'
    );
  });

  it('linka Termos de Uso e Declaração de Privacidade no rodapé', () => {
    render(
      <MemoryRouter>
        <HomePage returnTo="/upload" />
      </MemoryRouter>
    );

    const footer = screen.getByRole('navigation', { name: 'Legal' });
    expect(within(footer).getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute(
      'href',
      '/terms'
    );
    expect(within(footer).getByRole('link', { name: 'Declaração de Privacidade' })).toHaveAttribute(
      'href',
      '/privacy'
    );
  });

  it('deixa claro que o investimento em IA para autoria de transformações ainda não existe', () => {
    render(
      <MemoryRouter>
        <HomePage returnTo="/upload" />
      </MemoryRouter>
    );

    expect(screen.getByText(/ainda não foi construído/i)).toBeVisible();
  });

  it('traduz falha OIDC para uma mensagem segura', () => {
    render(
      <MemoryRouter>
        <HomePage returnTo="/upload" authError="invalid_callback" />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/expirou ou não pôde ser validada/i);
  });

  it('mensagem de login_failed não presume qual provedor (Microsoft/Google) falhou', () => {
    // Regressão: o BFF registra a mesma rota de callback para Entra e Google e devolve o mesmo
    // authError=login_failed nos dois casos; a mensagem já citou só "Microsoft" e apareceu para
    // quem tentou entrar com Google a partir da home pública.
    render(
      <MemoryRouter>
        <HomePage returnTo="/upload" authError="login_failed" />
      </MemoryRouter>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/não foi possível concluir a entrada/i);
    expect(alert).not.toHaveTextContent(/microsoft/i);
    expect(alert).not.toHaveTextContent(/google/i);
  });
});
