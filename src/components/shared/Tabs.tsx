import React, { ReactNode } from 'react';
import './Tabs.css';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) => {
  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  // Filtrar tabs vazias (caso alguma seja condicionalmente removida)
  const visibleTabs = tabs.filter(tab => tab !== undefined);

  return (
    <div className={`tabs-container ${className}`}>
      <div className="tabs-header">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {activeTabContent}
      </div>
    </div>
  );
};

export default Tabs;

