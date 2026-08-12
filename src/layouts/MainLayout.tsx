import React, { useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import AuthenticationGate from '../components/auth/AuthenticationGate';
import { useAppStore } from '../store/useAppStore';
import { useSessionStore } from '../store/useSessionStore';
import { SESSION_EXPIRED_EVENT } from '../types/session';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
  const { parseResult } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, authenticated, user, isAdmin, error, loadSession, expireSession } =
    useSessionStore();

  const searchParameters = new URLSearchParams(location.search);
  const authError = searchParameters.get('authError');
  searchParameters.delete('authError');
  const cleanSearch = searchParameters.toString();
  const returnTo = `${location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${location.hash}`;

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
  }, [expireSession]);

  // Redirecionar para /upload se estiver em /analysis sem parseResult
  useEffect(() => {
    if (location.pathname === '/analysis' && (!parseResult || !parseResult.success)) {
      navigate('/upload', { replace: true });
    }
  }, [location.pathname, parseResult, navigate]);

  if (status === 'idle' || status === 'loading') {
    return (
      <AuthenticationGate
        status="loading"
        returnTo={returnTo}
        onRetry={() => void loadSession(true)}
      />
    );
  }

  if (status === 'error') {
    return (
      <AuthenticationGate
        status="error"
        returnTo={returnTo}
        infrastructureError={error}
        onRetry={() => void loadSession(true)}
      />
    );
  }

  if (!authenticated) {
    return (
      <AuthenticationGate
        status="unauthenticated"
        returnTo={returnTo}
        authError={authError}
        onRetry={() => void loadSession(true)}
      />
    );
  }

  const userName = user?.name || 'Conta Microsoft';
  const userInitial = userName.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'U';

  return (
    <div className="main-layout">
      <header className="session-bar">
        <Link to="/upload" className="session-brand" aria-label="Ir para o processamento">
          <img src="/layoutparser-mark.svg" alt="" />
          <span>LayoutParser</span>
        </Link>
        <div className="session-account">
          {isAdmin && (
            <Link to="/admin" className="session-admin-link">
              Administração
            </Link>
          )}
          <span className="session-avatar" aria-hidden="true">
            {userInitial}
          </span>
          <span className="session-user" title={userName}>
            {userName}
          </span>
          <form method="post" action="/auth/logout">
            <button type="submit" className="session-logout">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="main-content">
        <div className="main-content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
