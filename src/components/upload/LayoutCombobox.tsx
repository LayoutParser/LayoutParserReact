import React, { useEffect, useId, useRef, useState } from 'react';
import type { Layout } from '../../types/layout';
import './LayoutCombobox.css';

interface LayoutComboboxProps {
  layouts: Layout[];
  onSelect: (layout: Layout) => void;
  selectedLayout: Layout | null;
  disabled?: boolean;
}

const LayoutCombobox: React.FC<LayoutComboboxProps> = ({
  layouts,
  onSelect,
  selectedLayout,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const comboboxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const componentId = useId();
  const listboxId = `${componentId}-layout-options`;

  const filteredLayouts = layouts.filter(layout => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = layout.name?.toLowerCase().includes(term);
    const guidMatch = layout.layoutGuid?.toLowerCase().includes(term);
    return nameMatch || guidMatch;
  });

  if (disabled && (isOpen || searchTerm)) {
    setIsOpen(false);
    setSearchTerm('');
  }

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

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

  const closeCombobox = (returnFocus: boolean) => {
    setIsOpen(false);
    setSearchTerm('');
    if (returnFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const handleSelect = (layout: Layout) => {
    onSelect(layout);
    closeCombobox(true);
  };

  const focusOption = (index: number) => {
    const optionCount = filteredLayouts.length;
    if (optionCount === 0) return;

    const normalizedIndex = (index + optionCount) % optionCount;
    optionRefs.current[normalizedIndex]?.focus();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeCombobox(true);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const selectedIndex = filteredLayouts.findIndex(
        layout => layout.layoutGuid === selectedLayout?.layoutGuid
      );
      focusOption(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(filteredLayouts.length - 1);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeCombobox(true);
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(filteredLayouts.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeCombobox(true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const layout = filteredLayouts[index];
      if (layout) {
        handleSelect(layout);
      }
    }
  };

  return (
    <div className="layout-combobox" ref={comboboxRef}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className={`combobox-trigger ${selectedLayout ? 'has-selection' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={
          selectedLayout ? `Layout selecionado: ${selectedLayout.name}` : 'Selecionar Layout'
        }
        disabled={disabled}
        onClick={() => setIsOpen(open => !open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="combobox-label">
          {selectedLayout ? selectedLayout.name : 'Selecionar Layout'}
        </span>
        <span className="combobox-arrow" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="combobox-dropdown">
          <div className="combobox-search">
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Buscar layout por nome ou GUID"
              aria-controls={listboxId}
              placeholder="Buscar por nome ou layoutGuid..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="combobox-search-input"
            />
          </div>

          <div id={listboxId} className="combobox-options" role="listbox">
            {filteredLayouts.length === 0 ? (
              <div className="combobox-no-results" role="status">
                Nenhum layout encontrado
              </div>
            ) : (
              filteredLayouts.map((layout, index) => {
                const isSelected = selectedLayout?.layoutGuid === layout.layoutGuid;
                return (
                  <button
                    ref={element => {
                      optionRefs.current[index] = element;
                    }}
                    key={layout.layoutGuid || layout.name}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`combobox-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(layout)}
                    onKeyDown={event => handleOptionKeyDown(event, index)}
                  >
                    <div className="option-name">{layout.name || 'Sem nome'}</div>
                    {layout.layoutGuid && (
                      <div className="option-guid">
                        GUID: {layout.layoutGuid.substring(0, 8)}...
                      </div>
                    )}
                  </button>
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
