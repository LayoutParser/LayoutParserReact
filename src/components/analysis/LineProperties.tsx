import React from 'react';
import { usePropertiesStore } from '../../store/usePropertiesStore';
import type { LayoutElement } from '../../types/structure';
import './LineProperties.css';

const LineProperties: React.FC = () => {
  const { selectedLine, showProperties, propertiesType, hideProperties } = usePropertiesStore();

  if (!showProperties || propertiesType !== 'line' || !selectedLine) {
    return null;
  }

  return (
    <div className="line-properties">
      <div className="properties-header">
        <h3>Propriedades da Linha</h3>
        <button 
          type="button" 
          onClick={hideProperties}
          className="properties-close"
        >
          ×
        </button>
      </div>
      
      <div className="properties-content">
        <div className="property-item">
          <span className="property-label">Nome:</span>
          <span className="property-value">{selectedLine.name}</span>
        </div>
        
        <div className="property-item">
          <span className="property-label">Tipo:</span>
          <span className="property-value">{selectedLine.type}</span>
        </div>
        
        <div className="property-item">
          <span className="property-label">Sequência:</span>
          <span className="property-value">{selectedLine.sequence}</span>
        </div>
        
        {selectedLine.description && (
          <div className="property-item">
            <span className="property-label">Descrição:</span>
            <span className="property-value">{selectedLine.description}</span>
          </div>
        )}
        
        <div className="property-item">
          <span className="property-label">Obrigatório:</span>
          <span className="property-value">
            {selectedLine.isRequired ? '✅ Sim' : '❌ Não'}
          </span>
        </div>
        
        {selectedLine.elements && selectedLine.elements.length > 0 && (
          <div className="property-item">
            <span className="property-label">Elementos Filhos:</span>
            <span className="property-value">{selectedLine.elements.length}</span>
          </div>
        )}
        
        {selectedLine.elementGuid && (
          <div className="property-item">
            <span className="property-label">GUID:</span>
            <span className="property-value property-guid">{selectedLine.elementGuid}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LineProperties;

