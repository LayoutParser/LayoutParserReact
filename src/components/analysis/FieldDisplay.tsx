import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFieldStore } from '../../store/useFieldStore';
import { useSearchStore } from '../../store/useSearchStore';
import { usePropertiesStore } from '../../store/usePropertiesStore';
import type { Field } from '../../types/field';
import type { FieldGroup } from '../../types/field';
import './FieldDisplay.css';

const FieldDisplay: React.FC = () => {
  const { parseResult, fields } = useAppStore();
  const { fieldGroups, selectField, highlightedFields, highlightField } = useFieldStore();
  const { searchResults, currentResultIndex } = useSearchStore();
  const { showFieldProperties } = usePropertiesStore();

  // Usar campos do parseResult se fields estiver vazio
  const actualFields = fields.length > 0 ? fields : (parseResult?.fields || []);

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

  // Sincronizar campos com o store se necessário
  useEffect(() => {
    if (actualFields.length > 0) {
      const { setFields: setFieldsInStore } = useFieldStore.getState();
      setFieldsInStore(actualFields);
    }
  }, [actualFields]);

  // Criar grupos se fieldGroups estiver vazio mas houver campos
  const displayGroups = fieldGroups.length > 0 ? fieldGroups : (() => {
    if (actualFields.length === 0) return [];
    const groupsMap = new Map<string, Field[]>();
    actualFields.forEach(field => {
      const lineName = field.lineName || 'OUTROS';
      if (!groupsMap.has(lineName)) {
        groupsMap.set(lineName, []);
      }
      groupsMap.get(lineName)!.push(field);
    });
    return Array.from(groupsMap.entries()).map(([lineName, fields]) => ({
      lineName,
      fields: fields.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
      sequence: fields[0]?.sequence || 0,
    })).sort((a, b) => a.sequence - b.sequence);
  })();

  if (!actualFields || actualFields.length === 0) {
    return (
      <div className="field-display-empty">
        <p>Nenhum campo disponível. Processe um documento primeiro.</p>
        {parseResult && parseResult.success && (
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Debug: parseResult.success=true, mas nenhum campo encontrado.
            {parseResult.fields ? ` Campos na resposta: ${parseResult.fields.length}` : ' Sem campo fields na resposta.'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="field-display">
      {displayGroups.map((group) => (
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

