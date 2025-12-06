import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFieldStore } from '../../store/useFieldStore';
import { useSearchStore } from '../../store/useSearchStore';
import type { Field } from '../../types/field';
import type { FieldGroup } from '../../types/field';
import './FieldDisplay.css';

const FieldDisplay: React.FC = () => {
  const { parseResult, fields, txtContent } = useAppStore();
  const { fieldGroups, selectField, highlightedFields, highlightField } = useFieldStore();
  const { searchResults, currentResultIndex } = useSearchStore();

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
    // Não mostrar propriedades, apenas destacar
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

  // Função para extrair número da linha do nome (ex: "LINHA000" -> "000")
  const extractLineNumber = (lineName: string): string => {
    const match = lineName.match(/(\d+)$/);
    if (match) {
      return match[1].padStart(3, '0');
    }
    if (lineName === 'HEADER') return '000';
    return '000';
  };

  // Função para extrair o sequencial do arquivo baseado na posição da linha
  const extractSequentialFromFile = (lineName: string, lineSequence: string, txtContent: string): string => {
    if (lineName === 'HEADER') {
      // HEADER não tem sequencial antes dele no arquivo
      return '000000';
    }
    
    if (!txtContent || !lineSequence) {
      return '000000';
    }
    
    // Procurar a sequência da linha no texto
    // O arquivo tem linhas de 600 caracteres, e o sequencial está nas primeiras 6 posições
    const index = txtContent.indexOf(lineSequence);
    if (index >= 0) {
      // Calcular o início da linha (cada linha tem 600 caracteres)
      const lineStart = Math.floor(index / 600) * 600;
      
      // O sequencial está nas posições 0-5 de cada linha
      const sequentialInFile = txtContent.substring(lineStart, lineStart + 6);
      
      // Verificar se é um número válido (formato: 000001, 000002, etc)
      if (/^\d{6}$/.test(sequentialInFile)) {
        return sequentialInFile;
      }
    }
    
    // Se não encontrou, tentar usar o lineSequence como sequencial (se for numérico)
    if (lineSequence && /^\d+$/.test(lineSequence)) {
      return lineSequence.padStart(6, '0');
    }
    
    return '000000';
  };

  // Função para calcular a posição da linha no arquivo baseado no lineSequence
  const calculateLinePosition = (lineSequence: string, txtContent: string): number => {
    if (!txtContent || !lineSequence) return -1;
    // Procurar a sequência no texto (formato: 000001, 000002, etc)
    const index = txtContent.indexOf(lineSequence);
    return index >= 0 ? index : -1;
  };

  // Criar grupos se fieldGroups estiver vazio mas houver campos
  // Agrupar por linha e ordenar pela posição real no arquivo
  const displayGroups = fieldGroups.length > 0 ? fieldGroups : (() => {
    if (actualFields.length === 0) return [];
    const groupsMap = new Map<string, Field[]>();
    actualFields.forEach(field => {
      const lineName = field.lineName || 'OUTROS';
      const key = lineName;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(field);
    });
    
    return Array.from(groupsMap.entries()).map(([lineName, fields]) => {
      const lineSequence = fields[0]?.lineSequence || extractLineNumber(lineName);
      const position = calculateLinePosition(lineSequence, txtContent);
      const sequential = extractSequentialFromFile(lineName, lineSequence, txtContent);
      
      return {
        lineName,
        fields: fields.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
        sequence: fields[0]?.sequence || 0,
        lineSequence,
        position, // Posição no arquivo para ordenação
        sequential, // Sequencial extraído do arquivo
      };
    }).sort((a, b) => {
      // Ordenar por posição no arquivo (HEADER primeiro se não tiver sequência)
      if (a.lineName === 'HEADER' && a.position < 0) return -1;
      if (b.lineName === 'HEADER' && b.position < 0) return 1;
      
      if (a.position >= 0 && b.position >= 0) {
        return a.position - b.position;
      }
      
      // Fallback: ordenar por sequência da linha
      if (a.lineSequence && b.lineSequence) {
        return a.lineSequence.localeCompare(b.lineSequence);
      }
      return a.sequence - b.sequence;
    });
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
      {displayGroups.map((group, groupIndex) => {
        const lineNumber = group.lineSequence || extractLineNumber(group.lineName);
        const sequentialNumber = (group as any).sequential || '000000';
        
        return (
          <div key={`${group.lineName}_${groupIndex}`} className="field-line-container">
            <div className="field-line-info">
              <span className="line-sequential">{sequentialNumber}</span>
              <span className="line-number">{lineNumber}</span>
              <span className="line-name">{group.lineName}</span>
            </div>
            
            <div className="field-list-inline">
              {group.fields.map((field, index) => {
                const highlighted = isFieldHighlighted(field);
                const inSearch = isFieldInSearch(field);
                const fieldId = `${field.lineName}_${field.fieldName}`;
                
                return (
                  <span
                    key={`${field.lineName}_${field.fieldName}_${index}`}
                    data-field-id={fieldId}
                    className={`field-inline ${highlighted ? 'highlighted' : ''} ${inSearch ? 'in-search' : ''}`}
                    onClick={() => handleFieldClick(field)}
                    title={`${field.fieldName} (Seq: ${field.sequence || index + 1}) - Valor: ${field.value || '(vazio)'} - Len: ${field.length || 'N/A'}`}
                  >
                    {field.value || ' '}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FieldDisplay;

