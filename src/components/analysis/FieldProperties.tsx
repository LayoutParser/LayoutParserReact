import React from 'react';
import { usePropertiesStore } from '../../store/usePropertiesStore';
import './FieldProperties.css';

const FieldProperties: React.FC = () => {
  const { selectedField, showProperties, propertiesType, hideProperties } = usePropertiesStore();

  if (!showProperties || propertiesType !== 'field' || !selectedField) {
    return null;
  }

  return (
    <div className="field-properties">
      <div className="properties-header">
        <h3>Propriedades do Campo</h3>
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
          <span className="property-value">{selectedField.fieldName}</span>
        </div>
        
        <div className="property-item">
          <span className="property-label">Linha:</span>
          <span className="property-value">{selectedField.lineName}</span>
        </div>
        
        <div className="property-item">
          <span className="property-label">Valor:</span>
          <span className="property-value property-value-text">{selectedField.value || '(vazio)'}</span>
        </div>
        
        {selectedField.startPosition !== undefined && (
          <div className="property-item">
            <span className="property-label">Posição Inicial:</span>
            <span className="property-value">{selectedField.startPosition}</span>
          </div>
        )}
        
        {selectedField.length !== undefined && (
          <div className="property-item">
            <span className="property-label">Comprimento:</span>
            <span className="property-value">{selectedField.length}</span>
          </div>
        )}
        
        {selectedField.sequence !== undefined && (
          <div className="property-item">
            <span className="property-label">Sequência:</span>
            <span className="property-value">{selectedField.sequence}</span>
          </div>
        )}
        
        {selectedField.dataType && (
          <div className="property-item">
            <span className="property-label">Tipo de Dado:</span>
            <span className="property-value">{selectedField.dataType}</span>
          </div>
        )}
        
        <div className="property-item">
          <span className="property-label">Status:</span>
          <span className={`property-value property-status ${selectedField.isValid === false ? 'invalid' : 'valid'}`}>
            {selectedField.isValid === false ? '❌ Inválido' : '✅ Válido'}
          </span>
        </div>
        
        {selectedField.errorMessage && (
          <div className="property-item property-error">
            <span className="property-label">Erro:</span>
            <span className="property-value">{selectedField.errorMessage}</span>
          </div>
        )}
        
        {selectedField.warningMessage && (
          <div className="property-item property-warning">
            <span className="property-label">Aviso:</span>
            <span className="property-value">{selectedField.warningMessage}</span>
          </div>
        )}
        
        {selectedField.fieldGuid && (
          <div className="property-item">
            <span className="property-label">GUID:</span>
            <span className="property-value property-guid">{selectedField.fieldGuid}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldProperties;

