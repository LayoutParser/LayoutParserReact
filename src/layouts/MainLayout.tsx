import React, { useState, useMemo } from 'react';
import { Tabs } from '../components/shared/Tabs';
import UploadSection from '../components/upload/UploadSection';
import { useAppStore } from '../store/useAppStore';
import './MainLayout.css';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('upload');
  const { parseResult } = useAppStore();

  // Tab de análise só aparece se houver parseResult
  const tabs = useMemo(() => {
    const baseTabs = [
      {
        id: 'upload',
        label: 'Upload & Processamento',
        content: <UploadSection />,
      },
    ];

    // Adicionar tab de análise apenas se houver resultado de parse
    if (parseResult && parseResult.success) {
      baseTabs.push({
        id: 'analysis',
        label: 'Análise & Estrutura',
        content: (
          <div className="tab-placeholder">
            <h3>Análise & Estrutura</h3>
            <p>Esta funcionalidade será implementada na Fase 2 - Módulo 2</p>
          </div>
        ),
      });
    }

    return baseTabs;
  }, [parseResult]);

  // Se a tab ativa for 'analysis' mas não houver parseResult, voltar para 'upload'
  React.useEffect(() => {
    if (activeTab === 'analysis' && (!parseResult || !parseResult.success)) {
      setActiveTab('upload');
    }
  }, [activeTab, parseResult]);

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

