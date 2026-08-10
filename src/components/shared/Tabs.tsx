import React, { useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
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

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, className = '' }) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const componentId = useId();
  const visibleTabs = tabs.filter(tab => tab !== undefined);
  const activeTabIndex = visibleTabs.findIndex(tab => tab.id === activeTab);
  const activeTabContent = activeTabIndex >= 0 ? visibleTabs[activeTabIndex].content : null;

  const focusAndActivateTab = (index: number) => {
    if (visibleTabs.length === 0) return;

    const normalizedIndex = (index + visibleTabs.length) % visibleTabs.length;
    const tab = visibleTabs[normalizedIndex];
    tabRefs.current[normalizedIndex]?.focus();
    onTabChange(tab.id);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusAndActivateTab(index + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusAndActivateTab(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusAndActivateTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusAndActivateTab(visibleTabs.length - 1);
    }
  };

  const activePanelId = activeTabIndex >= 0 ? `${componentId}-panel-${activeTabIndex}` : undefined;
  const activeTabId = activeTabIndex >= 0 ? `${componentId}-tab-${activeTabIndex}` : undefined;

  return (
    <div className={`tabs-container ${className}`}>
      <div className="tabs-header" role="tablist" aria-label="Navegação por abas">
        {visibleTabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              ref={element => {
                tabRefs.current[index] = element;
              }}
              key={tab.id}
              id={`${componentId}-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${componentId}-panel-${index}`}
              tabIndex={isActive ? 0 : -1}
              className={`tab-button ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={event => handleTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id={activePanelId}
        className="tabs-content"
        role="tabpanel"
        aria-labelledby={activeTabId}
        tabIndex={0}
      >
        {activeTabContent}
      </div>
    </div>
  );
};

export default Tabs;
