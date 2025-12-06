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
  const extractSequentialFromFile = (lineName: string, lineSequence: string, txtContent: string, position: number): string => {
    if (!txtContent) {
      return '000001';
    }
    
    // HEADER: se lineSequence é "HEADER", significa que não tem sequencial antes
    // HEADER sempre é o primeiro, então sequencial é 000001
    if (lineName === 'HEADER' || lineSequence === 'HEADER') {
      return '000001';
    }
    
    if (!lineSequence || position < 0) {
      return '000000';
    }
    
    // Para outras linhas, o sequencial está nas primeiras 6 posições de cada linha de 600 caracteres
    // Calcular o início da linha (cada linha tem 600 caracteres)
    const lineStart = Math.floor(position / 600) * 600;
    
    // O sequencial está nas posições 0-5 de cada linha
    const sequentialInFile = txtContent.substring(lineStart, lineStart + 6);
    
    // Verificar se é um número válido (formato: 000001, 000002, etc)
    if (/^\d{6}$/.test(sequentialInFile)) {
      return sequentialInFile;
    }
    
    // Se não encontrou sequencial válido, tentar usar o lineSequence como sequencial (se for numérico)
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
  // Agrupar por lineSequence + occurrence para manter múltiplas ocorrências da mesma linha
  const displayGroups = fieldGroups.length > 0 ? fieldGroups : (() => {
    if (actualFields.length === 0) return [];
    const groupsMap = new Map<string, Field[]>();
    
    // Agrupar por lineSequence + occurrence para distinguir múltiplas ocorrências
    actualFields.forEach(field => {
      const lineName = field.lineName || 'OUTROS';
      const lineSequence = field.lineSequence || extractLineNumber(lineName);
      const occurrence = field.occurrence || 1;
      // Chave única: lineSequence + occurrence para distinguir múltiplas ocorrências
      const key = `${lineSequence}_${occurrence}_${lineName}`;
      
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(field);
    });
    
    return Array.from(groupsMap.entries()).map(([key, fields]) => {
      const lineName = fields[0]?.lineName || 'OUTROS';
      const lineSequence = fields[0]?.lineSequence || extractLineNumber(lineName);
      let position = -1;
      
      // HEADER: se lineSequence é "HEADER", procurar diretamente no texto
      if (lineSequence === 'HEADER' || lineName === 'HEADER') {
        position = txtContent.indexOf('HEADER');
      } else {
        // Para outras linhas, procurar pelo lineSequence no texto
        position = calculateLinePosition(lineSequence, txtContent);
      }
      
      // Extrair sequencial do arquivo
      const sequential = extractSequentialFromFile(lineName, lineSequence, txtContent, position);
      
      return {
        lineName,
        fields: fields.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
        sequence: fields[0]?.sequence || 0,
        lineSequence,
        position,
        sequential,
        occurrence: fields[0]?.occurrence || 1,
      };
    }).sort((a, b) => {
      // Ordenar por posição no arquivo
      if (a.position >= 0 && b.position >= 0) {
        return a.position - b.position;
      }
      
      // HEADER sempre primeiro se não tiver posição calculada
      if (a.lineName === 'HEADER' || a.lineSequence === 'HEADER') return -1;
      if (b.lineName === 'HEADER' || b.lineSequence === 'HEADER') return 1;
      
      // Fallback: ordenar por sequencial numérico
      const seqA = parseInt(a.sequential || '0', 10);
      const seqB = parseInt(b.sequential || '0', 10);
      if (seqA !== seqB) return seqA - seqB;
      
      // Se mesmo sequencial, ordenar por occurrence
      return (a.occurrence || 1) - (b.occurrence || 1);
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
        const groupData = group as any;
        const lineSequence = groupData.lineSequence || extractLineNumber(group.lineName);
        
        // Determinar número da linha e sequencial
        let lineNumber = '000';
        let sequentialNumber = groupData.sequential || '000001';
        
        if (lineSequence === 'HEADER' || group.lineName === 'HEADER') {
          lineNumber = '000';
          sequentialNumber = '000001'; // HEADER sempre é o primeiro
        } else {
          // Para outras linhas, usar o lineSequence como número da linha
          lineNumber = lineSequence;
          // O sequencial já foi extraído do arquivo
          if (sequentialNumber === '000000') {
            // Fallback: usar o lineSequence como sequencial se for numérico
            if (/^\d+$/.test(lineSequence)) {
              sequentialNumber = lineSequence.padStart(6, '0');
            } else {
              sequentialNumber = String(groupIndex + 1).padStart(6, '0');
            }
          }
        }
        
        return (
          <div key={`${group.lineName}_${groupData.occurrence || 1}_${groupIndex}`} className="field-line-container">
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

