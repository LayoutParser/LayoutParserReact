import React, { useState } from 'react';
import { Tabs } from '../components/shared/Tabs';
import UploadSection from '../components/upload/UploadSection';
import './MainLayout.css';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('upload');

  const tabs = [
    {
      id: 'upload',
      label: 'Upload & Processamento',
      content: <UploadSection />,
    },
    {
      id: 'analysis',
      label: 'Análise & Estrutura',
      content: (
        <div className="tab-placeholder">
          <h3>Análise & Estrutura</h3>
          <p>Esta funcionalidade será implementada na Fase 2 - Módulo 2</p>
        </div>
      ),
    },
    {
      id: 'console',
      label: 'Console de Processamento',
      content: (
        <div className="tab-placeholder">
          <h3>Console de Processamento</h3>
          <p>Esta funcionalidade será implementada na Fase 2 - Módulo 5</p>
        </div>
      ),
    },
  ];

  return (
    <div className="main-layout">
      <header className="main-header">
        <h1>Parser de Layout Posicional + IA Analyzer</h1>
        <p>Migração para React + TypeScript</p>
      </header>
      
      <main className="main-content">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </main>
    </div>
  );
};

export default MainLayout;

