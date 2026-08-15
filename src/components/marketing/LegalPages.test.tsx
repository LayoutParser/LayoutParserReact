import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PrivacyPage from './PrivacyPage';
import TermsPage from './TermsPage';

describe('TermsPage', () => {
  it('renderiza sem autenticação, com título e placeholders marcados', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Termos de Uso', level: 1 })).toBeVisible();
    expect(screen.getByText('[jurisdição]')).toBeVisible();
    expect(screen.getByText('[e-mail de contato]')).toBeVisible();
  });
});

describe('PrivacyPage', () => {
  it('renderiza sem autenticação e descreve os escopos de login coletados', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: 'Declaração de Privacidade', level: 1 })
    ).toBeVisible();
    expect(screen.getByText(/openid/)).toBeVisible();
    expect(screen.getByText(/profile/)).toBeVisible();
  });
});
