import React from 'react';
import { Link } from 'react-router-dom';
import './LegalPage.css';

interface LegalPageProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

/**
 * Casca comum para páginas legais públicas (Termos, Privacidade): cabeçalho com a marca,
 * link de volta e rodapé. Não depende de sessão — precisa renderizar sem autenticação.
 */
const LegalPage: React.FC<LegalPageProps> = ({ title, updatedAt, children }) => {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-brand">
          <img src="/layoutparser-mark.svg" alt="" className="legal-brand-mark" />
          <span>LayoutParser</span>
        </Link>
        <Link to="/" className="legal-back-link">
          Voltar
        </Link>
      </header>
      <main className="legal-main">
        <h1>{title}</h1>
        <p className="legal-updated">Última atualização: {updatedAt}</p>
        {children}
      </main>
      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} NDD — LayoutParser (uso interno)</span>
      </footer>
    </div>
  );
};

export default LegalPage;
