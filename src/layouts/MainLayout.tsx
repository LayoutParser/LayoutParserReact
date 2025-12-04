import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
  const { parseResult } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirecionar para /upload se estiver em /analysis sem parseResult
  useEffect(() => {
    if (location.pathname === '/analysis' && (!parseResult || !parseResult.success)) {
      navigate('/upload', { replace: true });
    }
  }, [location.pathname, parseResult, navigate]);

  return (
    <div className="main-layout">
      <header className="main-header">
        <h1>Parser de Layout</h1>
      </header>
      
      <main className="main-content">
        <nav className="main-nav">
          <NavLink
            to="/upload"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Upload & Processamento
          </NavLink>
          {parseResult && parseResult.success && (
            <NavLink
              to="/analysis"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Análise & Estrutura
            </NavLink>
          )}
        </nav>
        
        <div className="main-content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;

