import React from 'react';
import './AuthenticationGate.css';

interface AuthenticationGateProps {
  status: 'loading' | 'unauthenticated' | 'error';
  returnTo: string;
  authError?: string | null;
  infrastructureError?: string | null;
  onRetry: () => void;
}

const authenticationMessages: Record<string, string> = {
  access_denied: 'A entrada foi cancelada. Você pode tentar novamente quando estiver pronto.',
  invalid_callback:
    'A resposta de autenticação expirou ou não pôde ser validada. Inicie uma nova entrada.',
  login_failed: 'A Microsoft não conseguiu concluir a entrada. Tente novamente.',
  temporarily_unavailable:
    'O serviço de autenticação está temporariamente indisponível. Tente novamente em instantes.',
};

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
        <p className="authentication-privacy">
          Sua senha permanece na Microsoft. O LayoutParser recebe apenas os dados mínimos de
          identidade necessários para criar a sessão.
        </p>
      </section>
    </main>
  );
};

export default AuthenticationGate;
