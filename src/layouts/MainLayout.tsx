import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
      <main className="main-content">
        <div className="main-content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;

