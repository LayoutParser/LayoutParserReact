import React, { useState, useRef, useEffect } from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import { useAppStore } from '../../store/useAppStore';
import type { Layout } from '../../types/layout';
import './LayoutCombobox.css';

interface LayoutComboboxProps {
  layouts: Layout[];
  onSelect: (layout: Layout) => void;
  selectedLayout: Layout | null;
}

const LayoutCombobox: React.FC<LayoutComboboxProps> = ({ layouts, onSelect, selectedLayout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Filtrar layouts baseado no termo de busca
  const filteredLayouts = layouts.filter(layout => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = layout.name?.toLowerCase().includes(term);
    const guidMatch = layout.layoutGuid?.toLowerCase().includes(term);
    return nameMatch || guidMatch;
  });

  // Fechar combobox ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (layout: Layout) => {
    onSelect(layout);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (!selectedLayout) {
      setIsOpen(!isOpen);
    } else {
      // Se já tem layout selecionado, permite abrir para trocar
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="layout-combobox" ref={comboboxRef}>
      <div 
        className={`combobox-trigger ${selectedLayout ? 'has-selection' : ''}`}
        onClick={handleToggle}
      >
        <span className="combobox-label">
          {selectedLayout ? selectedLayout.name : 'Selecionar Layout'}
        </span>
        <span className="combobox-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="combobox-dropdown">
          <div className="combobox-search">
            <input
              type="text"
              placeholder="Buscar por nome ou layoutGuid..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="combobox-search-input"
              autoFocus
            />
          </div>
          
          <div className="combobox-options">
            {filteredLayouts.length === 0 ? (
              <div className="combobox-no-results">Nenhum layout encontrado</div>
            ) : (
              filteredLayouts.map((layout) => {
                const isSelected = selectedLayout?.layoutGuid === layout.layoutGuid;
                return (
                  <div
                    key={layout.layoutGuid || layout.name}
                    className={`combobox-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(layout)}
                  >
                    <div className="option-name">{layout.name || 'Sem nome'}</div>
                    {layout.layoutGuid && (
                      <div className="option-guid">GUID: {layout.layoutGuid.substring(0, 8)}...</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutCombobox;

