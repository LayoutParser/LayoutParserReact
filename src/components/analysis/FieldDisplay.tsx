import React, { useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFieldStore } from '../../store/useFieldStore';
import { useSearchStore } from '../../store/useSearchStore';
import type { Field } from '../../types/field';
import { findFirstDesyncLineIndex } from '../../utils/documentHealth';
import DocumentHealthBanner from './DocumentHealthBanner';
import './FieldDisplay.css';

const FieldDisplay: React.FC = () => {
  const { parseResult, fields, txtContent } = useAppStore();
  const { fieldGroups, selectField, highlightedFields, highlightField } = useFieldStore();
  const { searchResults, currentResultIndex } = useSearchStore();

  // Usar campos do parseResult se fields estiver vazio.
  // Memoizado para estabilizar a identidade do array: o efeito de sincronização mais abaixo
  // depende dele e, sem isso, o `|| []` devolvia um array novo a cada render. O valor
  // calculado é o mesmo de antes — só a identidade passa a ser reaproveitada.
  const actualFields = useMemo(
    () => (fields.length > 0 ? fields : parseResult?.fields || []),
    [fields, parseResult?.fields]
  );

  // Função comentada - não utilizada (número da linha agora é sequencial)
  // const getLineInitialValue = (lineName: string): string | null => {
  //   if (!parseResult?.layout?.elements) return null;
  //
  //   const lineElement = parseResult.layout.elements.find(
  //     (el: any) => el.type === 'LineElementVO' && el.name === lineName
  //   );
  //
  //   return lineElement?.initialValue || null;
  // };

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
    return searchResults.some(
      result =>
        result.field.lineName === field.lineName && result.field.fieldName === field.fieldName
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

  // Função para extrair SEMPRE apenas os últimos 3 dígitos do nome da linha
  // Ex: "LINHA096" -> "096", "LINHA999999" -> "999"
  const extractLineNumber3 = (lineName: string): string => {
    const digits = (lineName.match(/(\d+)$/)?.[1] ?? '').trim();
    if (!digits) return '000';
    return digits.slice(-3).padStart(3, '0');
  };

  // Função para extrair o sequencial do arquivo baseado na posição da linha
  const extractSequentialFromFile = (
    lineName: string,
    lineSequence: string,
    txtContent: string,
    position: number
  ): string => {
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
  const displayGroups: DisplayGroup[] =
    fieldGroups.length > 0
      ? fieldGroups
      : (() => {
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

          return Array.from(groupsMap.entries())
            .map(([, fields]) => {
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
              const sequential = extractSequentialFromFile(
                lineName,
                lineSequence,
                txtContent,
                position
              );

              return {
                lineName,
                fields: fields.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
                sequence: fields[0]?.sequence || 0,
                lineSequence,
                position,
                sequential,
                occurrence: fields[0]?.occurrence || 1,
              };
            })
            .sort((a, b) => {
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
        {/* Também aqui: um 200 com defeito e sem campos renderizáveis não pode terminar em
            "nenhum campo disponível" sem dizer que o documento tem defeito. */}
        <DocumentHealthBanner />
        <p>Nenhum campo disponível. Processe um documento primeiro.</p>
        {parseResult && parseResult.success && (
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Debug: parseResult.success=true, mas nenhum campo encontrado.
            {parseResult.fields
              ? ` Campos na resposta: ${parseResult.fields.length}`
              : ' Sem campo fields na resposta.'}
          </p>
        )}
      </div>
    );
  }

  // ✅ Verificar se há erros de validação no documento
  const validationErrors = parseResult?.validationErrors || [];
  const hasValidationErrors = validationErrors.length > 0;

  // O CORTE da exibição é condicionado à CLASSE do erro, não à mera existência de erro.
  // Só erro de tamanho de linha desloca os offsets seguintes; erro de conteúdo (sequência
  // inválida etc.) não move nada e não pode esconder o resto do documento. Ver
  // `isDesyncingValidationError`. Antes, qualquer erro cortava — e num caso real 46 registros
  // alinhados sumiam da tela por causa de erros de sequência.
  const firstDesyncLineIndex = findFirstDesyncLineIndex(validationErrors);
  const isTruncated = firstDesyncLineIndex >= 0;

  // ✅ Índice físico da linha no TXT (0-based, considerando blocos de 600 chars)
  // Preferimos calcular via `position` (mais confiável) para não depender do índice do array.
  const getPhysicalLineIndex = (group: DisplayGroup, fallbackIndex: number): number => {
    const pos = group?.position;
    if (typeof pos === 'number' && pos >= 0) {
      return Math.floor(pos / 600);
    }
    return fallbackIndex;
  };

  // ✅ Renderizar apenas até a primeira linha que DESSINCRONIZA (inclusive). Sem erro desse
  // tipo, o documento inteiro é exibido — com os defeitos anotados linha a linha.
  const groupsToRender = isTruncated
    ? displayGroups.filter((g, idx) => getPhysicalLineIndex(g, idx) <= firstDesyncLineIndex)
    : displayGroups;

  // ✅ Função para verificar se uma linha tem erro específico
  //
  // Independe do corte: TODA linha com defeito é marcada, inclusive as que continuam sendo
  // exibidas depois de um erro que não dessincroniza. Marcar é o que aponta o problema ao
  // usuário; cortar é só a proteção contra exibir dado desalinhado.
  const isLineWithError = (lineIndex: number): boolean =>
    validationErrors.some(error => error.lineIndex === lineIndex);

  // ✅ Função para identificar qual campo específico está causando erro na linha
  const getProblematicField = (
    group: DisplayGroup,
    groupIndex: number
  ): { fieldName: string; issue: string; expectedSize?: number; actualSize?: number } | null => {
    const lineError = validationErrors.find(error => error.lineIndex === groupIndex);
    if (!lineError) return null;

    // ✅ IDENTIDADE DE CAMPO VINDA DO BACK-END tem precedência absoluta sobre a heurística
    // abaixo (spec "Taxonomia de falha do parse" §3). A heurística deduz o campo por
    // aritmética de posição acumulada — é chute educado, e chute não deve competir com quem
    // validou o documento. Enquanto `fieldName` vier null/ausente, seguimos na heurística.
    //
    // ⚠️ `recordName`/`recordGuid` NÃO entram aqui de propósito, mesmo sendo o que o back-end
    // realmente emite hoje: eles identificam o REGISTRO (a linha inteira), não um campo dela.
    // Usá-los para destacar um campo específico seria apresentar dado de segmento como se
    // fosse de campo — exatamente o erro que a spec §5.1 recusou ao manter `fieldGuid` nulo.
    // A identidade de registro aparece no DocumentHealthBanner, onde o rótulo é honesto.
    const reportedField = lineError.fieldName?.trim();
    if (reportedField) {
      return {
        fieldName: reportedField,
        issue: lineError.errorMessage || 'Campo apontado como defeituoso pela validação',
        expectedSize: lineError.expectedLength,
        actualSize: lineError.actualLength,
      };
    }

    // Para linhas com erro de tamanho, identificar qual campo está causando o problema
    const displayFields = group.fields
      .filter((field: Field) => !field.fieldName?.toUpperCase().includes('SEQUENCIA'))
      .sort(
        (a: Field, b: Field) =>
          (a.startPosition ?? a.sequence ?? 0) - (b.startPosition ?? b.sequence ?? 0)
      );

    // Calcular posições cumulativas para identificar onde o problema ocorre
    let currentPosition = 0;
    const sequenceLength = 6; // Sequencial sempre 6 chars
    const lineNumberLength = 3; // Número da linha sempre 3 chars

    // Adicionar sequencial e número da linha
    currentPosition += sequenceLength + lineNumberLength;

    // Verificar cada campo
    for (const field of displayFields) {
      const fieldStart = field.startPosition ? field.startPosition - 1 : currentPosition; // converter para 0-based
      const fieldLength = field.length || field.value?.length || 1;

      // Se a posição do campo + seu tamanho excederia 600, este campo é problemático
      if (fieldStart + fieldLength > 600) {
        return {
          fieldName: field.fieldName || 'Campo Desconhecido',
          issue: 'Campo excede limite de 600 caracteres da linha',
          expectedSize: 600 - fieldStart,
          actualSize: fieldLength,
        };
      }

      // Se chegamos ao limite de 600 caracteres antes de processar todos os campos
      if (currentPosition >= 600) {
        return {
          fieldName: field.fieldName || 'Campo Desconhecido',
          issue: 'Campo não cabe na linha (limite de 600 caracteres atingido)',
          expectedSize: 0,
          actualSize: fieldLength,
        };
      }

      currentPosition = fieldStart + fieldLength;
    }

    // Se não encontrou campo específico, pode ser um problema geral de tamanho
    return {
      fieldName: 'Estrutura da Linha',
      issue: `Linha tem ${lineError.actualLength} caracteres (esperado: ${lineError.expectedLength})`,
      expectedSize: lineError.expectedLength,
      actualSize: lineError.actualLength,
    };
  };

  // ✅ Log informativo sobre processamento
  console.log(
    `📊 FieldDisplay: renderizando ${groupsToRender.length} grupos de linhas` +
      `${isTruncated ? ` (cortado na linha física ${firstDesyncLineIndex}, que dessincroniza)` : ''}` +
      `${hasValidationErrors && !isTruncated ? ` (${validationErrors.length} defeito(s) anotado(s), sem corte)` : ''}`
  );

  return (
    <div className="field-display">
      {/* Estado "200 com defeito": o documento continua abaixo, com os defeitos anotados.
          Substitui o alerta inline que só aparecia quando `validationWarning` vinha
          preenchido — a decisão agora é do `documentHealth`/`validationErrors`. */}
      <DocumentHealthBanner />

      {/* Nota de leitura específica desta aba: o corte das linhas seguintes é comportamento
          do FieldDisplay, não do payload, então não pertence ao banner de saúde. Só aparece
          quando o corte REALMENTE aconteceu — anunciar corte inexistente faria o usuário
          procurar linhas que estão logo ali na tela. */}
      {isTruncated && (
        <p className="field-display-truncation-note">
          O documento é posicional: um tamanho de linha errado desalinha tudo o que vem depois,
          então a exibição vai até a primeira linha com tamanho incorreto (destacada em vermelho) e
          para. Os demais defeitos ficam marcados no documento, sem interromper a exibição.
        </p>
      )}

      {groupsToRender.map((group, groupIndex) => {
        const groupData: DisplayGroup = group;
        const physicalLineIndex = getPhysicalLineIndex(groupData, groupIndex);
        const isHeader = group.lineName === 'HEADER' || groupData.lineSequence === 'HEADER';
        const isLine999999 = group.lineName === 'LINHA999999' || group.lineName?.includes('999999');

        // ✅ Obter informação de ocorrência para exibição
        const occurrence = groupData.occurrence || 1;
        const hasMultipleOccurrences =
          groupsToRender.filter(g => g.lineName === group.lineName).length > 1;

        // ✅ Verificar se esta linha tem erro de validação
        // Calcular posição da linha no TXT (baseado no índice do grupo)
        // let lineStartPosition = -1; - não usado diretamente, calculado quando necessário

        const hasLineError = isLineWithError(physicalLineIndex);
        const problematicField = hasLineError
          ? getProblematicField(group, physicalLineIndex)
          : null;

        // Determinar o sequencial a ser exibido (6 dígitos) - sempre do TXT
        // Extrair diretamente do txtContent (primeiras 6 posições de cada linha)
        let displaySequential = '000000';

        // `position` só existe nos grupos derivados aqui; vindo do store é undefined.
        // O -1 reproduz o comportamento anterior, em que `undefined >= 0` já era falso.
        const groupPosition = groupData.position ?? -1;
        if (txtContent && groupPosition >= 0) {
          const lineStart = Math.floor(groupPosition / 600) * 600;
          const sequentialInFile = txtContent.substring(lineStart, lineStart + 6);
          if (sequentialInFile) {
            displaySequential = sequentialInFile;
          }
        }

        // Para HEADER, se não encontrou no TXT, usar "HEADER" como fallback
        if (isHeader && displaySequential === '000000') {
          displaySequential = 'HEADER';
        }

        // O número da linha agora é calculado posteriormente como lineNumberFromJson

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

        // Usar posições calculadas do back-end (apenas para layouts configurados)
        const lineValidation = parseResult?.lineValidations?.find(
          lv => lv.lineName === group.lineName
        );

        if (lineValidation && lineValidation.calculatedPositions) {
          // Usar posições calculadas do back-end
          const calculatedPositions = lineValidation.calculatedPositions;
          if (calculatedPositions && typeof calculatedPositions === 'object') {
            displayFields.forEach(field => {
              // ⚠️ Chave do mapa NÃO é mais field.fieldName puro: layouts com nomes de campo
              // duplicados na mesma linha (ex: LINHA037/038/055/090 do layout NFe da Fiat)
              // faziam vários campos colidirem na mesma startPosition. Back-end confirmou
              // (@lp-backend-dev) chave composta "Name#Sequence", ex: "ValorDaBase...#9".
              const key =
                field.sequence !== undefined && field.sequence !== null
                  ? `${field.fieldName}#${field.sequence}`
                  : field.fieldName; // fallback defensivo se sequence não vier preenchido
              const calculatedPos = calculatedPositions[key];
              if (calculatedPos !== undefined && calculatedPos !== null) {
                field.startPosition = calculatedPos;
              } else if (field.sequence === undefined || field.sequence === null) {
                console.warn(
                  `⚠️ Campo "${field.fieldName}" da linha ${group.lineName} sem "sequence" definido; usando fieldName puro como chave de posição pode colidir com campos de mesmo nome na linha.`
                );
              } else {
                console.warn(
                  `⚠️ Chave "${key}" não encontrada em calculatedPositions para o campo "${field.fieldName}" da linha ${group.lineName}.`
                );
              }
            });

            if (groupIndex === 0) {
              console.log(`✅ Usando posições calculadas do back-end para ${group.lineName}:`, {
                totalLength: lineValidation.totalLength,
                isValid: lineValidation.isValid,
                positions: Object.entries(calculatedPositions).slice(0, 5),
              });
            }
          }
        } else {
          // Se não houver lineValidations (layout não configurado para cálculo), usar startPosition que já vem nos campos
          // Isso é normal para layouts que não estão na lista de layouts com cálculo específico
          if (groupIndex === 0 && parseResult?.lineValidations) {
            // Se lineValidations existe mas não tem esta linha, significa que o layout não está configurado
            console.log(
              `ℹ️ Layout não configurado para cálculo de validação, usando startPosition dos campos para ${group.lineName}`
            );
          }
        }

        // Debug: log dos campos
        if (groupIndex === 0) {
          const lineValidation = parseResult?.lineValidations?.find(
            lv => lv.lineName === group.lineName
          );
          console.log('🔍 FieldDisplay - Primeira linha:', {
            lineName: group.lineName,
            fieldsCount: displayFields.length,
            fields: displayFields.slice(0, 5).map(f => ({
              name: f.fieldName,
              value: f.value?.substring(0, 20) || '(vazio)',
              startPosition: f.startPosition,
              length: f.length,
            })),
            calculatedPositions: lineValidation?.calculatedPositions
              ? Object.entries(lineValidation.calculatedPositions).slice(0, 5)
              : [],
          });
        }

        // Se não há campos, retornar linha vazia
        if (displayFields.length === 0) {
          return (
            <div
              key={`${group.lineName}_${groupData.occurrence || 1}_${groupIndex}`}
              className="field-line-container"
            >
              <div className="field-list-inline">
                {isHeader ? (
                  <span
                    className="field-sequential field-sequential-header"
                    title="Sequencial: HEADER (000001)"
                  >
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

        // Construir linha completa com 600 caracteres usando a lógica do back-end
        const LINE_LENGTH = 600;
        const lineParts: Array<{
          type: 'field' | 'space' | 'initial' | 'sequence' | 'static';
          content: string;
          field?: Field;
          start: number;
          end: number;
        }> = [];

        // Calcular a posição real da linha no TXT
        // Cada linha tem exatamente 600 caracteres: linha 0 = 0-599, linha 1 = 600-1199, etc.
        let lineStart = -1;

        if (txtContent) {
          // Prioridade 1: usar groupDataPosition se disponível (mais confiável)
          if (groupData.position !== undefined && groupData.position >= 0) {
            lineStart = Math.floor(groupData.position / 600) * 600;
          } else {
            // Prioridade 2: usar o índice do grupo para calcular
            // HEADER é grupo 0 (linha 0), LINHA000 é grupo 1 (linha 600), etc.
            lineStart = groupIndex * 600;

            // Validar: se o primeiro campo tem startPosition, verificar se está na linha correta
            const firstField = displayFields.length > 0 ? displayFields[0] : null;
            if (firstField && firstField.startPosition && firstField.startPosition > 0) {
              const fieldPos = firstField.startPosition - 1; // Converter para 0-based
              const calculatedLineStart = Math.floor(fieldPos / 600) * 600;
              // Se a diferença for muito grande, usar o calculado
              if (Math.abs(calculatedLineStart - lineStart) > 300) {
                lineStart = calculatedLineStart;
              }
            }
          }

          // Garantir que lineStart não ultrapasse o tamanho do txtContent
          if (lineStart >= txtContent.length) {
            lineStart = -1;
          }

          // Debug: verificar cálculo do lineStart
          if (groupIndex < 3) {
            console.log(`📍 Cálculo lineStart para linha ${groupIndex}:`, {
              groupDataPosition: groupData.position,
              groupIndex,
              calculatedByIndex: groupIndex * 600,
              finalLineStart: lineStart,
              firstFieldStartPosition: displayFields[0]?.startPosition,
            });
          }
        }

        // IMPORTANTE: Usar APENAS os dados do JSON retornado pela API
        // O JSON já contém todas as informações parseadas:
        // - lineSequence: número da linha (3 dígitos, ex: "000", "001", "031")
        // - Campo "Sequencia": sequencial (6 dígitos) que pertence à PRÓXIMA linha
        // Para obter o sequencial da linha atual, buscar o campo "Sequencia" da linha ANTERIOR
        let sequentialFromJson = '';
        let lineNumberFromJson = '';
        let currentPos = 0;

        if (isHeader) {
          // HEADER: usar "HEADER" como sequencial (6 chars) e "HDR" como identificador da linha (3 chars)
          sequentialFromJson = 'HEADER';
          lineNumberFromJson = 'HDR';
        } else if (isLine999999) {
          // LINHA999999: usar sequencial do JSON se existir; caso contrário, usar "999999"
          const seqCandidate = String(groupData.lineSequence || groupData.sequential || '').trim();
          sequentialFromJson = /^\d{6}$/.test(seqCandidate) ? seqCandidate : '999999';
          lineNumberFromJson = extractLineNumber3(group.lineName);
        } else {
          // ✅ Usar APENAS o JSON do back-end:
          // - sequencial (6 dígitos) vem do ParsedField.LineSequence (primeiros 6 chars da linha)
          // - número da linha (3 dígitos) vem do nome da linha (LINHA096 -> 096)
          const seqCandidate = String(
            groupData.lineSequence || group.fields?.[0]?.lineSequence || ''
          ).trim();
          if (/^\d{6}$/.test(seqCandidate)) {
            sequentialFromJson = seqCandidate;
          } else if (seqCandidate === 'HEADER') {
            sequentialFromJson = 'HEADER';
          } else if (/^\d+$/.test(seqCandidate)) {
            sequentialFromJson = seqCandidate.padStart(6, '0').slice(-6);
          } else {
            sequentialFromJson = '000000';
          }

          lineNumberFromJson = extractLineNumber3(group.lineName);
        }

        // Debug: log para verificar extração do JSON
        if (groupIndex < 3) {
          const previousGroup = groupIndex > 0 ? groupsToRender[groupIndex - 1] : null;
          const previousSequenciaField = previousGroup?.fields?.find((f: Field) => {
            const fieldNameUpper = (f.fieldName?.toUpperCase() || '').trim();
            return fieldNameUpper === 'SEQUENCIA' || fieldNameUpper === 'SEQUÊNCIA';
          });
          const currentSequenciaField = group.fields?.find((f: Field) => {
            const fieldNameUpper = (f.fieldName?.toUpperCase() || '').trim();
            return fieldNameUpper === 'SEQUENCIA' || fieldNameUpper === 'SEQUÊNCIA';
          });
          const prevLineSeqFromGroup =
            previousGroup?.lineSequence || previousGroup?.fields?.[0]?.lineSequence || 'N/A';
          console.log(`🔍 Linha ${groupIndex} (${group.lineName}) - Dados do JSON:`, {
            lineSequence: groupData.lineSequence,
            sequentialFromJson,
            lineNumberFromJson,
            isHeader,
            previousLineName: previousGroup?.lineName,
            previousLineSequence: prevLineSeqFromGroup,
            previousSequenciaValue: previousSequenciaField?.value,
            previousSequenciaStartPos: previousSequenciaField?.startPosition,
            currentSequenciaValue: currentSequenciaField?.value,
            currentSequenciaStartPos: currentSequenciaField?.startPosition,
            allFieldNames: group.fields?.slice(0, 5).map((f: Field) => f.fieldName),
            firstFieldStartPosition: displayFields[0]?.startPosition,
          });
        }

        // 1. Adicionar sequencial (6 dígitos) - APENAS para linhas que NÃO são HEADER ou LINHA999999
        // IMPORTANTE: O sequencial vem do campo "Sequencia" da linha ANTERIOR (já parseado pela API)
        // HEADER e LINHA999999 NÃO têm sequencial, começam direto com o número da linha
        if (!isHeader && !isLine999999) {
          if (sequentialFromJson) {
            lineParts.push({
              type: 'sequence',
              content: sequentialFromJson,
              start: 0,
              end: 6,
            });
            currentPos = 6;
          } else {
            // Se não tem sequencial, começar na posição 0
            currentPos = 0;
          }
        } else {
          // HEADER e LINHA999999 não têm sequencial, mas precisam alinhar o número da linha
          // na mesma posição das outras linhas (após 6 caracteres de sequencial)
          // Não adicionar espaços - o número da linha começará na posição 0, mas será alinhado via CSS
          currentPos = 0;
        }

        // 2. Adicionar número da linha (3 dígitos) - sempre adicionar
        // IMPORTANTE: Usar lineSequence do JSON (já parseado pela API)
        if (lineNumberFromJson) {
          lineParts.push({
            type: 'initial',
            content: lineNumberFromJson,
            start: currentPos,
            end: currentPos + lineNumberFromJson.length,
          });
          currentPos += lineNumberFromJson.length;
        }

        // Debug: verificar o que foi adicionado ao lineParts
        if (groupIndex < 3) {
          const sequencePart = lineParts.find(p => p.type === 'sequence');
          const initialPart = lineParts.find(p => p.type === 'initial');
          console.log(
            `📝 lineParts após adicionar sequencial/linha (${group.lineName}) - DO JSON:`,
            {
              sequentialFromJson,
              lineNumberFromJson,
              currentPos,
              linePartsCount: lineParts.length,
              sequencePart: sequencePart
                ? {
                    type: sequencePart.type,
                    content: sequencePart.content,
                    start: sequencePart.start,
                    end: sequencePart.end,
                  }
                : null,
              initialPart: initialPart
                ? {
                    type: initialPart.type,
                    content: initialPart.content,
                    start: initialPart.start,
                    end: initialPart.end,
                  }
                : null,
              allParts: lineParts.map(p => ({
                type: p.type,
                content: p.content?.substring(0, 20),
                start: p.start,
                end: p.end,
              })),
            }
          );
        }

        // ✅ As posições (startPosition/length) já vêm corretas do back-end (1-based).
        // Não tentar "adivinhar" offsets no front-end.

        // OBS: O back-end não retorna o campo "Sequencia" (ele é filtrado).
        // Então não tentamos completar a linha adicionando "Sequencia" no final.

        // 4. Campos da linha (já ordenados por startPosition, SEM a tag Sequencia própria)
        // A tag Sequencia desta linha será adicionada no final para completar 600 caracteres

        // ✅ Checagem defensiva: dois campos consecutivos com startPosition idêntico ou fora de
        // ordem crescente indicam colisão na chave do mapa de posições calculadas (ex: nome de
        // campo duplicado na linha, ver comentário acima sobre calculatedPositions). Detectar
        // aqui em vez de deixar o overflow estourar silenciosamente só no total final da linha.
        for (let i = 1; i < displayFields.length; i++) {
          const prev = displayFields[i - 1];
          const curr = displayFields[i];
          if (prev.startPosition !== undefined && curr.startPosition !== undefined) {
            if (curr.startPosition <= prev.startPosition) {
              console.warn(
                `⚠️ Possível nome de campo duplicado na linha ${group.lineName}: "${curr.fieldName}" (startPosition=${curr.startPosition}) não é maior que "${prev.fieldName}" (startPosition=${prev.startPosition}). Verificar mapeador/back-end (calculatedPositions).`
              );
            }
          }
        }

        displayFields.forEach(field => {
          // startPosition é sempre 1-based (vem do back-end)
          let startPos = field.startPosition ?? 0;

          // Converter para 0-based para uso interno
          if (startPos > 0) {
            startPos = startPos - 1;
          } else {
            // Se não tem startPosition, usar posição atual
            startPos = currentPos;
          }

          // Não pular campos com base em heurística de offset; confiar no startPosition do back-end.

          const fieldLength = field.length || 1; // Mínimo 1 para evitar campos invisíveis
          let fieldValue = field.value || '';

          // Se não tem valor mas tem length, preencher com espaços
          if (!fieldValue && fieldLength > 0) {
            // Para Filler, sempre usar espaços
            if (
              field.fieldName?.toUpperCase().includes('FILLER') ||
              field.fieldName?.toUpperCase() === 'FILLER'
            ) {
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

          // Adicionar espaço antes do campo se necessário (reduzir espaços múltiplos)
          if (startPos > currentPos) {
            const spaceCount = startPos - currentPos;
            // Reduzir espaços múltiplos - se houver muitos espaços, usar apenas 1
            const spaceContent = spaceCount > 1 ? ' ' : ' '.repeat(spaceCount);
            lineParts.push({
              type: 'space',
              content: spaceContent,
              start: currentPos,
              end: startPos,
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
              end: actualStart + actualLength,
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
              end: LINE_LENGTH,
            });
            currentPos = LINE_LENGTH;
          }
        });

        // Não adicionar "Sequencia" ao final no front-end.

        // 5. Preencher até 600 caracteres se necessário (não deveria acontecer se cálculo estiver correto)
        if (currentPos < LINE_LENGTH) {
          const missing = LINE_LENGTH - currentPos;
          lineParts.push({
            type: 'space',
            content: ' '.repeat(missing),
            start: currentPos,
            end: LINE_LENGTH,
          });
          console.warn(
            `⚠️ Linha ${group.lineName} tem apenas ${currentPos} chars, preenchendo ${missing} espaços`
          );
        } else if (currentPos > LINE_LENGTH) {
          console.warn(`⚠️ Linha ${group.lineName} excedeu 600 chars (${currentPos}), truncando`);
        }

        // Validar e garantir que a linha tenha exatamente 600 caracteres
        let fullLineContent = '';
        lineParts.forEach(part => {
          fullLineContent += part.content;
        });

        // Log de validação (apenas para primeira linha)
        if (groupIndex === 0) {
          console.log(`📏 Validação da linha ${group.lineName}:`, {
            totalChars: fullLineContent.length,
            expected: LINE_LENGTH,
            isValid: fullLineContent.length === LINE_LENGTH,
            partsCount: lineParts.length,
            parts: lineParts.map(p => ({
              type: p.type,
              length: p.content.length,
              start: p.start,
              end: p.end,
            })),
          });
        }

        // Se não tiver 600 caracteres, preencher com espaços no final
        if (fullLineContent.length < LINE_LENGTH) {
          const missing = LINE_LENGTH - fullLineContent.length;
          lineParts.push({
            type: 'space',
            content: ' '.repeat(missing),
            start: currentPos,
            end: LINE_LENGTH,
          });
          fullLineContent = fullLineContent.padEnd(LINE_LENGTH, ' ');
        } else if (fullLineContent.length > LINE_LENGTH) {
          // Truncar se exceder (não deveria acontecer)
          fullLineContent = fullLineContent.substring(0, LINE_LENGTH);
          console.warn(`⚠️ Linha ${group.lineName} excedeu 600 caracteres, truncando`);
        }

        return (
          <div
            key={`${group.lineName}_${occurrence}_${groupIndex}`}
            className={`field-line-container ${hasLineError ? 'line-with-error' : ''}`}
          >
            {/* ✅ Indicador de múltiplas ocorrências */}
            {hasMultipleOccurrences && occurrence > 1 && (
              <div className="line-occurrence-indicator">
                {group.lineName} - Ocorrência {occurrence}
              </div>
            )}
            <div className={`field-list-inline ${hasLineError ? 'line-with-error-content' : ''}`}>
              {/* Linha completa com exatamente 600 caracteres */}
              <span
                className={`field-line-content ${hasLineError ? 'line-with-error-content' : ''}`}
              >
                {(() => {
                  // Debug: verificar lineParts antes de renderizar
                  if (groupIndex < 3) {
                    const sequencePart = lineParts.find(p => p.type === 'sequence');
                    console.log(`🎬 ANTES DE RENDERIZAR linha ${groupIndex} (${group.lineName}):`, {
                      linePartsCount: lineParts.length,
                      sequencePart: sequencePart
                        ? {
                            type: sequencePart.type,
                            content: sequencePart.content,
                            start: sequencePart.start,
                            end: sequencePart.end,
                          }
                        : null,
                      allSequenceParts: lineParts
                        .filter(p => p.type === 'sequence')
                        .map(p => ({ content: p.content, start: p.start, end: p.end })),
                    });
                  }
                  return lineParts.map((part, partIndex) => {
                    if (part.type === 'space') {
                      // Renderizar espaços diretamente sem span, mas reduzir espaços múltiplos
                      const spaceContent = part.content.replace(/\s+/g, ' '); // Reduzir múltiplos espaços para um único
                      // Renderizar como string diretamente (React renderiza strings)
                      return spaceContent || null;
                    }

                    if (part.type === 'sequence') {
                      // Sequencial (6 dígitos) - destacar com cinza
                      // IMPORTANTE: HEADER e LINHA999999 não devem ter esta tag, apenas espaços invisíveis
                      let sequentialContent = String(part.content || '');

                      // Se tiver conteúdo numérico, garantir 6 dígitos
                      if (/^\d+$/.test(sequentialContent.trim())) {
                        sequentialContent = sequentialContent.trim().padStart(6, '0');
                      } else if (sequentialContent.trim() === '') {
                        // Se estiver vazio, usar padrão
                        sequentialContent = '000000';
                      } else {
                        // Se não for numérico, garantir 6 caracteres
                        sequentialContent = sequentialContent.padEnd(6, ' ');
                      }

                      // Debug: verificar o valor sendo renderizado
                      if (groupIndex < 3) {
                        console.log(
                          `🎨 Renderizando sequencial para linha ${groupIndex} (${group.lineName}) partIndex ${partIndex}:`,
                          {
                            partContent: part.content,
                            partContentType: typeof part.content,
                            sequentialContent,
                            sequentialContentLength: sequentialContent.length,
                            isHeader,
                            isLine999999,
                            partType: part.type,
                            partStart: part.start,
                            partEnd: part.end,
                            partObject: JSON.stringify(part),
                            linePartsLength: lineParts.length,
                            allSequenceParts: lineParts
                              .filter(p => p.type === 'sequence')
                              .map(p => ({ content: p.content, index: lineParts.indexOf(p) })),
                          }
                        );
                      }

                      // Usar uma key única que inclui o conteúdo para forçar re-render se mudar
                      return (
                        <span
                          key={`seq-${groupIndex}-${partIndex}-${sequentialContent.replace(/\s/g, '_')}`}
                          className="field-static field-sequential-static"
                          data-sequential={sequentialContent}
                        >
                          {sequentialContent}
                        </span>
                      );
                    }

                    if (part.type === 'initial') {
                      // Número da linha (3 dígitos) - destacar com rosa
                      return (
                        <span
                          key={`${part.type}-${partIndex}`}
                          className="field-static field-line-number-static"
                        >
                          {part.content}
                        </span>
                      );
                    }

                    if (part.type === 'static') {
                      // Conteúdo estático (como tag Sequencia no final) - não destacar
                      return (
                        <span key={`${part.type}-${partIndex}`} className="field-static">
                          {part.content}
                        </span>
                      );
                    }

                    if (part.type === 'field' && part.field) {
                      const field = part.field;
                      const fieldId = `${field.lineName}_${field.fieldName}`;
                      const highlighted = isFieldHighlighted(field);
                      const inSearch = isFieldInSearch(field);

                      // ✅ Verificar se este campo é o problemático na linha com erro
                      const isProblematicField =
                        problematicField && problematicField.fieldName === field.fieldName;

                      return (
                        <span
                          key={`field-${partIndex}`}
                          data-field-id={fieldId}
                          className={`field-inline ${highlighted ? 'highlighted' : ''} ${inSearch ? 'in-search' : ''} ${isProblematicField ? 'field-problematic' : ''}`}
                          onClick={() => handleFieldClick(field)}
                          title={`${field.fieldName} (Pos: ${part.start + 1}-${part.end}) - Valor: ${field.value || '(vazio)'} - Len: ${field.length || 'N/A'}${isProblematicField ? ` - ❌ ${problematicField.issue}` : ''}`}
                        >
                          {part.content}
                        </span>
                      );
                    }

                    return null;
                  });
                })()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FieldDisplay;
