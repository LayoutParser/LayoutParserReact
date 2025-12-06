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

  // Função para obter o initialValue de uma linha do layout
  const getLineInitialValue = (lineName: string): string | null => {
    if (!parseResult?.layout?.elements) return null;
    
    const lineElement = parseResult.layout.elements.find(
      (el: any) => el.type === 'LineElementVO' && el.name === lineName
    );
    
    return lineElement?.initialValue || null;
  };

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
    
    // HEADER: sempre é o primeiro sequencial (000001)
    if (lineName === 'HEADER' || lineSequence === 'HEADER') {
      return '000001';
    }
    
    if (position < 0) {
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
        const isHeader = group.lineName === 'HEADER' || groupData.lineSequence === 'HEADER';
        
        // Determinar o sequencial a ser exibido
        // Para HEADER: usar "HEADER"
        // Para outras linhas: usar o initialValue do layout (ex: "000", "001")
        // OU o valor do campo "Sequencia" da linha anterior
        let displaySequential = '000001';
        
        if (isHeader) {
          displaySequential = 'HEADER';
        } else {
          // Primeiro: tentar buscar initialValue do layout
          const initialValue = getLineInitialValue(group.lineName);
          if (initialValue) {
            // Se initialValue é numérico (ex: "000", "001"), formatar como sequencial de 6 dígitos
            if (/^\d+$/.test(initialValue)) {
              displaySequential = initialValue.padStart(6, '0');
            } else {
              displaySequential = initialValue;
            }
          } else {
            // Fallback 1: buscar campo "Sequencia" da linha anterior
            if (groupIndex > 0) {
              const previousGroup = displayGroups[groupIndex - 1] as any;
              const previousSequenciaField = previousGroup.fields?.find(
                (f: Field) => (f.fieldName?.toUpperCase() || '') === 'SEQUENCIA'
              );
              if (previousSequenciaField?.value) {
                const seqValue = previousSequenciaField.value.trim();
                if (/^\d{6}$/.test(seqValue)) {
                  displaySequential = seqValue;
                } else if (/^\d+$/.test(seqValue)) {
                  displaySequential = seqValue.padStart(6, '0');
                }
              }
            }
            
            // Fallback 2: tentar extrair do txtContent
            if (displaySequential === '000001' && txtContent && groupData.position >= 0) {
              const lineStart = Math.floor(groupData.position / 600) * 600;
              const sequentialInFile = txtContent.substring(lineStart, lineStart + 6);
              if (/^\d{6}$/.test(sequentialInFile)) {
                displaySequential = sequentialInFile;
              } else if (groupData.lineSequence && /^\d+$/.test(groupData.lineSequence)) {
                displaySequential = groupData.lineSequence.padStart(6, '0');
              }
            }
          }
        }
        
        // Filtrar e ordenar campos (excluir Sequencia, incluir Filler)
        const displayFields = group.fields
          .filter(field => {
            const fieldNameUpper = field.fieldName?.toUpperCase() || '';
            return fieldNameUpper !== 'SEQUENCIA';
          })
          .sort((a, b) => {
            // Ordenar campos por startPosition ou sequence para manter ordem correta
            const posA = a.startPosition ?? a.sequence ?? 0;
            const posB = b.startPosition ?? b.sequence ?? 0;
            return posA - posB;
          });

        // Debug: log dos campos
        if (groupIndex === 0) {
          console.log('🔍 FieldDisplay - Primeira linha:', {
            lineName: group.lineName,
            fieldsCount: displayFields.length,
            fields: displayFields.slice(0, 5).map(f => ({
              name: f.fieldName,
              value: f.value?.substring(0, 20) || '(vazio)',
              startPosition: f.startPosition,
              length: f.length
            }))
          });
        }
        
        // Se não há campos, retornar linha vazia
        if (displayFields.length === 0) {
          return (
            <div key={`${group.lineName}_${groupData.occurrence || 1}_${groupIndex}`} className="field-line-container">
              <div className="field-list-inline">
                {isHeader ? (
                  <span className="field-sequential field-sequential-header" title="Sequencial: HEADER (000001)">
                    HEADER
                  </span>
                ) : (
                  <span className="field-sequential" title={`Sequencial: ${displaySequential}`}>
                    {displaySequential}
                  </span>
                )}
                <span className="field-line-content">{' '.repeat(600)}</span>
              </div>
            </div>
          );
        }

        // Construir linha completa com 600 caracteres
        const LINE_LENGTH = 600;
        const lineParts: Array<{ type: 'field' | 'space'; content: string; field?: Field; start: number; end: number }> = [];
        let currentPos = 0;
        
        displayFields.forEach((field, fieldIndex) => {
          // startPosition pode ser 1-based ou 0-based, vamos tratar ambos
          let startPos = field.startPosition ?? 0;
          // Se startPosition parece ser 1-based (maior que 0), converter para 0-based
          if (startPos > 0) {
            startPos = startPos - 1;
          }
          
          // Se não tem startPosition, usar posição sequencial baseada no índice
          if (!field.startPosition && fieldIndex > 0) {
            // Tentar calcular baseado no campo anterior
            const prevField = displayFields[fieldIndex - 1];
            const prevStart = (prevField.startPosition ?? 0) > 0 ? (prevField.startPosition ?? 0) - 1 : 0;
            const prevLength = prevField.length || 0;
            startPos = prevStart + prevLength;
          }
          
          const fieldLength = field.length || 1; // Mínimo 1 para evitar campos invisíveis
          let fieldValue = field.value || '';
          
          // Se não tem valor mas tem length, preencher com espaços
          if (!fieldValue && fieldLength > 0) {
            // Para Filler, sempre usar espaços
            if (field.fieldName?.toUpperCase().includes('FILLER') || field.fieldName?.toUpperCase() === 'FILLER') {
              fieldValue = ' '.repeat(fieldLength);
            } else {
              // Para outros campos vazios, usar espaços também para manter o layout
              fieldValue = ' '.repeat(fieldLength);
            }
          }
          
          // Garantir que o valor tenha o tamanho correto
          if (fieldLength > 0) {
            if (fieldValue.length < fieldLength) {
              // Preencher com espaços à direita
              fieldValue = fieldValue.padEnd(fieldLength, ' ');
            } else if (fieldValue.length > fieldLength) {
              // Truncar se for maior
              fieldValue = fieldValue.substring(0, fieldLength);
            }
          } else if (!fieldValue) {
            // Se não tem length definido e não tem valor, usar pelo menos 1 espaço
            fieldValue = ' ';
          }
          
          // Adicionar espaço antes do campo se necessário
          if (startPos > currentPos) {
            lineParts.push({
              type: 'space',
              content: ' '.repeat(startPos - currentPos),
              start: currentPos,
              end: startPos
            });
            currentPos = startPos;
          }
          
          // Adicionar o campo (sempre adicionar, mesmo se startPos for negativo)
          const actualStart = Math.max(0, startPos);
          const actualLength = fieldLength || fieldValue.length || 1;
          
          if (actualStart + actualLength <= LINE_LENGTH) {
            lineParts.push({
              type: 'field',
              content: fieldValue,
              field: field,
              start: actualStart,
              end: actualStart + actualLength
            });
            currentPos = actualStart + actualLength;
          } else if (actualStart < LINE_LENGTH) {
            // Campo que ultrapassa o limite, truncar
            const truncatedLength = LINE_LENGTH - actualStart;
            lineParts.push({
              type: 'field',
              content: fieldValue.substring(0, truncatedLength),
              field: field,
              start: actualStart,
              end: LINE_LENGTH
            });
            currentPos = LINE_LENGTH;
          }
        });
        
        // Preencher até 600 caracteres se necessário
        if (currentPos < LINE_LENGTH) {
          lineParts.push({
            type: 'space',
            content: ' '.repeat(LINE_LENGTH - currentPos),
            start: currentPos,
            end: LINE_LENGTH
          });
        }
        
        return (
          <div key={`${group.lineName}_${groupData.occurrence || 1}_${groupIndex}`} className="field-line-container">
            <div className="field-list-inline">
              {/* Sequencial destacado */}
              {isHeader ? (
                <span className="field-sequential field-sequential-header" title="Sequencial: HEADER (000001)">
                  HEADER
                </span>
              ) : (
                <span className="field-sequential" title={`Sequencial: ${displaySequential}`}>
                  {displaySequential}
                </span>
              )}
              
              {/* Linha completa com 600 caracteres */}
              <span className="field-line-content">
                {lineParts.map((part, partIndex) => {
                  if (part.type === 'space') {
                    return <span key={`space-${partIndex}`} className="field-space">{part.content}</span>;
                  }
                  
                  const field = part.field!;
                  const fieldId = `${field.lineName}_${field.fieldName}`;
                  const highlighted = isFieldHighlighted(field);
                  const inSearch = isFieldInSearch(field);
                  
                  return (
                    <span
                      key={`field-${partIndex}`}
                      data-field-id={fieldId}
                      className={`field-inline ${highlighted ? 'highlighted' : ''} ${inSearch ? 'in-search' : ''}`}
                      onClick={() => handleFieldClick(field)}
                      title={`${field.fieldName} (Pos: ${part.start + 1}-${part.end}) - Valor: ${field.value || '(vazio)'} - Len: ${field.length || 'N/A'}`}
                    >
                      {part.content}
                    </span>
                  );
                })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FieldDisplay;

