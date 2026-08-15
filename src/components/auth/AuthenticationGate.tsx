import React from 'react';
import { authenticationMessages } from './authenticationMessages';
import './AuthenticationGate.css';

interface AuthenticationGateProps {
  status: 'loading' | 'unauthenticated' | 'error';
  returnTo: string;
  authError?: string | null;
  infrastructureError?: string | null;
  onRetry: () => void;
}

const AuthenticationGate: React.FC<AuthenticationGateProps> = ({
  status,
  returnTo,
  authError,
  infrastructureError,
  onRetry,
}) => {
  if (status === 'loading') {
    return (
      <main className="authentication-gate" aria-busy="true" aria-live="polite">
        <div className="authentication-card authentication-card--loading">
          <span className="authentication-spinner" aria-hidden="true" />
          <p>Confirmando sua sessão segura…</p>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="authentication-gate">
        <section className="authentication-card" aria-labelledby="session-error-title">
          <img src="/layoutparser-mark.svg" alt="" className="authentication-brand-mark" />
          <p className="authentication-eyebrow">Gateway indisponível</p>
          <h1 id="session-error-title">Não foi possível confirmar sua sessão</h1>
          <p>{infrastructureError || 'Verifique a conexão e tente novamente.'}</p>
          <button type="button" className="authentication-secondary-action" onClick={onRetry}>
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  const loginUrl = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  const googleLoginUrl = `/auth/google/login?returnTo=${encodeURIComponent(returnTo)}`;
  const safeAuthError = authError ? authenticationMessages[authError] : null;

  return (
    <main className="authentication-gate">
      <section className="authentication-card" aria-labelledby="authentication-title">
        <div className="authentication-brand">
          <img src="/layoutparser-mark.svg" alt="" className="authentication-brand-mark" />
          <span>LayoutParser</span>
        </div>
        <p className="authentication-eyebrow">Acesso protegido</p>
        <h1 id="authentication-title">Transforme documentos com segurança</h1>
        <p className="authentication-description">
          Entre com uma conta Microsoft pessoal, acadêmica ou corporativa para acessar o
          processamento de layouts.
        </p>

        {safeAuthError && (
          <p className="authentication-alert" role="alert">
            {safeAuthError}
          </p>
        )}

        <a className="authentication-primary-action" href={loginUrl}>
          <span className="microsoft-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          Entrar com Microsoft
        </a>
        <a
          className="authentication-secondary-action authentication-google-action"
          href={googleLoginUrl}
        >
          <svg className="google-symbol" aria-hidden="true" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
            />
          </svg>
          Entrar com Google
        </a>
        <p className="authentication-privacy">
          Sua senha permanece com o provedor escolhido (Microsoft ou Google). O LayoutParser recebe
          apenas os dados mínimos de identidade necessários para criar a sessão.
        </p>
      </section>
    </main>
  );
};

export default AuthenticationGate;
