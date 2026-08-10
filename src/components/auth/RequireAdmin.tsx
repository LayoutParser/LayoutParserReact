import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSessionStore } from '../../store/useSessionStore';
import './RequireAdmin.css';

interface RequireAdminProps {
  children: React.ReactNode;
}

const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const { status, authenticated, isAdmin, error, loadSession } = useSessionStore();

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (status === 'idle' || status === 'loading') {
    return (
      <main className="access-state" aria-busy="true" aria-live="polite">
        <div className="access-state__card">
          <span className="access-state__spinner" aria-hidden="true" />
          <p>Confirmando acesso administrativo…</p>
        </div>
      </main>
    );
  }

  if (!authenticated || !isAdmin || status === 'error') {
    return (
      <main className="access-state" role="alert">
        <div className="access-state__card">
          <p className="access-state__eyebrow">Acesso restrito</p>
          <h1>Esta área exige permissão administrativa.</h1>
          <p>{error || 'Sua identidade não possui a função necessária para abrir o painel.'}</p>
          <Link to="/upload">Voltar ao processamento</Link>
        </div>
      </main>
    );
  }

  return children;
};

export default RequireAdmin;
