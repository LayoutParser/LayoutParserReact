import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Tabs from './Tabs';

const TabsHarness = () => {
  const [activeTab, setActiveTab] = useState('structure');
  return (
    <Tabs
      tabs={[
        { id: 'structure', label: 'Estrutura', content: <p>Conteúdo da estrutura</p> },
        { id: 'xml', label: 'XML final', content: <p>Conteúdo XML</p> },
        { id: 'metrics', label: 'Métricas', content: <p>Conteúdo das métricas</p> },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
};

describe('Tabs', () => {
  it('conecta tablist, tabs e painel ativo por ARIA', () => {
    render(<TabsHarness />);

    const activeTab = screen.getByRole('tab', { name: 'Estrutura' });
    const panel = screen.getByRole('tabpanel');

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
    expect(activeTab).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', activeTab.id);
    expect(panel).toHaveTextContent('Conteúdo da estrutura');
  });

  it('navega e ativa abas com setas, Home e End', () => {
    render(<TabsHarness />);

    const structureTab = screen.getByRole('tab', { name: 'Estrutura' });
    fireEvent.keyDown(structureTab, { key: 'ArrowRight' });

    const xmlTab = screen.getByRole('tab', { name: 'XML final' });
    expect(xmlTab).toHaveFocus();
    expect(xmlTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Conteúdo XML');

    fireEvent.keyDown(xmlTab, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Métricas' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Métricas' }), { key: 'Home' });
    expect(structureTab).toHaveFocus();
    expect(structureTab).toHaveAttribute('aria-selected', 'true');
  });
});
