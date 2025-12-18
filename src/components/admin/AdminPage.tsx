import React, { useState } from 'react';
import LayoutParserPage from '../layout/LayoutParserPage';
import MonitoringTab from './MonitoringTab';
import LayoutValidationTab from './LayoutValidationTab';
import './AdminPage.css';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'processing' | 'monitoring' | 'validation'>('processing');

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Painel Administrativo</h1>
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab ${activeTab === 'processing' ? 'active' : ''}`}
            onClick={() => setActiveTab('processing')}
          >
            Processamento
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoring')}
          >
            Monitoramento
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'validation' ? 'active' : ''}`}
            onClick={() => setActiveTab('validation')}
          >
            Validação de Layouts
          </button>
        </div>
      </div>

      <div className="admin-content">
        {activeTab === 'processing' && (
          <div className="admin-tab-content">
            <LayoutParserPage />
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="admin-tab-content">
            <MonitoringTab />
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="admin-tab-content">
            <LayoutValidationTab />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;

