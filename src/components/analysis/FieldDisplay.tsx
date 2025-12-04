import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFieldStore } from '../../store/useFieldStore';
import { useSearchStore } from '../../store/useSearchStore';
import { usePropertiesStore } from '../../store/usePropertiesStore';
import type { Field } from '../../types/field';
import './FieldDisplay.css';

const FieldDisplay: React.FC = () => {
  const { fields } = useAppStore();
  const { fieldGroups, selectField, highlightedFields, highlightField } = useFieldStore();
  const { searchResults, currentResultIndex } = useSearchStore();
  const { showFieldProperties } = usePropertiesStore();

  useEffect(() => {
    // Quando há resultados de busca, destacar o campo atual
    if (searchResults.length > 0 && currentResultIndex >= 0) {
      const currentResult = searchResults[currentResultIndex];
      if (currentResult) {
        const fieldId = `${currentResult.field.lineName}_${currentResult.field.fieldName}`;
        highlightField(fieldId);
      }
    }
  }, [searchResults, currentResultIndex, highlightField]);

  const handleFieldClick = (field: Field) => {
    selectField(field);
    showFieldProperties(field);
  };

  const isFieldHighlighted = (field: Field): boolean => {
    const fieldId = `${field.lineName}_${field.fieldName}`;
    return highlightedFields.has(fieldId);
  };

  const isFieldInSearch = (field: Field): boolean => {
    return searchResults.some(result => 
      result.field.lineName === field.lineName && 
      result.field.fieldName === field.fieldName
    );
  };

  if (!fields || fields.length === 0) {
    return (
      <div className="field-display-empty">
        <p>Nenhum campo disponível. Processe um documento primeiro.</p>
      </div>
    );
  }

  return (
    <div className="field-display">
      {fieldGroups.map((group) => (
        <div key={group.lineName} className="field-group">
          <div className="field-group-header">
            <h3>{group.lineName}</h3>
            <span className="field-count">{group.fields.length} campos</span>
          </div>
          
          <div className="field-list">
            {group.fields.map((field, index) => {
              const highlighted = isFieldHighlighted(field);
              const inSearch = isFieldInSearch(field);
              
              return (
                <div
                  key={`${field.lineName}_${field.fieldName}_${index}`}
                  className={`field-item ${highlighted ? 'highlighted' : ''} ${inSearch ? 'in-search' : ''}`}
                  onClick={() => handleFieldClick(field)}
                >
                  <div className="field-header">
                    <span className="field-name">{field.fieldName}</span>
                    {field.sequence && (
                      <span className="field-sequence">Seq: {field.sequence}</span>
                    )}
                  </div>
                  
                  <div className="field-value">
                    <span className="value-label">Valor:</span>
                    <span className="value-text">{field.value || '(vazio)'}</span>
                  </div>
                  
                  {(field.startPosition !== undefined || field.length !== undefined) && (
                    <div className="field-position">
                      {field.startPosition !== undefined && (
                        <span>Pos: {field.startPosition}</span>
                      )}
                      {field.length !== undefined && (
                        <span>Len: {field.length}</span>
                      )}
                    </div>
                  )}
                  
                  {field.isValid === false && (
                    <div className="field-error">
                      ❌ {field.errorMessage || 'Campo inválido'}
                    </div>
                  )}
                  
                  {field.hasWarning && (
                    <div className="field-warning">
                      ⚠️ {field.warningMessage || 'Aviso'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FieldDisplay;

