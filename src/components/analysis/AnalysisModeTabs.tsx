import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import type { AnalysisMode } from '../../store/useTransformationStore';
import { transformationService } from '../../services/api/transformationService';
import { logService } from '../../services/api/logService';
import Tabs from '../shared/Tabs';
import FieldDisplay from './FieldDisplay';
import StructureTree from './StructureTree';
import XmlTransformationDisplay from './XmlTransformationDisplay';
import type { ParseResponse } from '../../types/api';
import { resolveLayoutGuid } from '../../utils/layoutGuid';
import './AnalysisModeTabs.css';

type TransformationReason = NonNullable<ParseResponse['transformationsReason']>;

/**
 * Texto do banner quando o parse deu certo mas NÃO há transformação XML.
 *
 * `transformationsReason` é aditivo/opcional (Fase 3 do back-end) — enquanto não for emitido,
 * cai no texto genérico. Importante: NÃO tentar distinguir "o gate barrou o documento" de
 * "rodou e nenhum mapper serviu" a partir de `transformationsStatus`, porque o back-end usa a
 * mesma string 'not_applicable' para os dois casos. O dado não suporta a distinção hoje.
 */
const NOT_APPLICABLE_TEXT: Record<TransformationReason, string> = {
  no_mapper: 'Nenhum mapeador de transformação cadastrado para este layout.',
  type_not_positional: 'O tipo detectado deste documento não entra no pathway de transformação.',
  empty_input: 'Documento sem conteúdo para transformar.',
  timeout_sync: 'A transformação não foi concluída no tempo previsto durante o processamento.',
  structural_error: 'A estrutura deste documento impediu a geração da transformação.',
};

const GENERIC_NOT_APPLICABLE_TEXT = 'Não há transformação XML disponível para este documento.';

/**
 * Alterna entre as duas formas de apresentar o documento processado:
 * - "TXT Posicional": visualização posicional já existente (FieldDisplay + StructureTree).
 * - "XML Transformação Final": só aparece quando existe um Mapper cadastrado para o
 *   layoutGuid selecionado. Esse é o critério de negócio confirmado com o usuário — NÃO é
 *   o campo `layoutType` (que hoje vem sempre como código numérico, ex.: "2", em todos os
 *   layouts reais consultados na API, e por isso não serve para essa decisão).
 */
const AnalysisModeTabs: React.FC = () => {
  const { parseResult, selectedLayout } = useAppStore();
  const {
    activeMode,
    mapperAvailable,
    isCheckingMapper,
    setActiveMode,
    setMapperAvailable,
    setCheckingMapper,
    setCandidatesResult,
    setCandidatesError,
    setDiagnostic,
    setDiagnosticError,
  } = useTransformationStore();

  // Ao processar um novo documento (novo parseResult/layout), verificar se existe
  // transformação XML disponível e limpar qualquer resultado de um documento anterior.
  useEffect(() => {
    // De onde sai o identificador usado na consulta de mapper: PRIORIDADE para o GUID do
    // PARSE, com o do catálogo só como fallback.
    //
    // Motivo (log de execução real): o catálogo devolve alguns layouts com o GUID ZERADO,
    // enquanto o parse do arquivo devolve o correto. Perguntando com o GUID zerado nenhum
    // mapper é encontrado, `mapperAvailable` fica falso e a aba de XML Transformação Final
    // NUNCA aparece — e continuaria escondida mesmo depois de o back-end corrigir o
    // catálogo, porque o front seguiria perguntando com o identificador errado.
    //
    // Isto NÃO muda o critério de negócio de quando a aba existe (continua sendo "há mapper
    // cadastrado para o layoutGuid", ver comentário do componente) — muda apenas QUAL valor
    // de layoutGuid alimenta essa pergunta.
    const layoutGuid = resolveLayoutGuid(
      parseResult?.layout?.layoutGuid,
      selectedLayout?.layoutGuid
    );

    if (!parseResult?.success || !layoutGuid) {
      return;
    }

    setCandidatesResult([], []);
    setCandidatesError(null);
    setDiagnostic(null);
    setDiagnosticError(null);
    setActiveMode('txt-posicional');
    setMapperAvailable(null);
    setCheckingMapper(true);

    transformationService
      .checkMapperAvailability(layoutGuid)
      .then(result => setMapperAvailable(result.available))
      .catch(error => {
        logService.error('Erro ao verificar disponibilidade de transformação XML', {
          layoutGuid,
          error: error instanceof Error ? error.message : String(error),
        });
        setMapperAvailable(false);
      })
      .finally(() => setCheckingMapper(false));
  }, [
    parseResult,
    selectedLayout?.layoutGuid,
    setActiveMode,
    setMapperAvailable,
    setCheckingMapper,
    setCandidatesResult,
    setCandidatesError,
    setDiagnostic,
    setDiagnosticError,
  ]);

  if (!parseResult || !parseResult.success) {
    return null;
  }

  const tabs = [
    {
      id: 'txt-posicional',
      label: 'TXT Posicional',
      content: (
        <div className="file-visualization">
          <div className="file-visualization-content">
            <FieldDisplay />
          </div>
          <div className="file-visualization-header">
            <StructureTree />
          </div>
        </div>
      ),
    },
  ];

  // Estado assíncrono da transformação vindo do próprio parse (`transformationsStatus`),
  // além da checagem de Mapper acima — cobre o caso em que o back-end ainda está processando
  // a transformação em segundo plano (ex.: pathway TCL-XSL mais custoso).
  const transformationsStatus = parseResult.transformationsStatus;
  const isTransformationProcessing = transformationsStatus === 'processing';
  const isTransformationNotApplicable = transformationsStatus === 'not_applicable';

  // O critério de existência da aba continua sendo `mapperAvailable`, NÃO o
  // `transformationsStatus` — regra de negócio confirmada com o usuário (ver cabeçalho).
  if (mapperAvailable) {
    tabs.push({
      id: 'xml-transformacao',
      // O rótulo NÃO carrega mais "(processando...)": esse estado nunca resolvia sozinho (não
      // existe polling no front nem endpoint que leia o resultado do background no back-end),
      // então o rótulo ficava preso para sempre. Um rótulo sem resolução é pior que rótulo
      // nenhum — o estado virou o banner acionável abaixo.
      label: 'XML Transformação Final',
      content: <XmlTransformationDisplay />,
    });
  }

  const notApplicableText = parseResult.transformationsReason
    ? (NOT_APPLICABLE_TEXT[parseResult.transformationsReason] ?? GENERIC_NOT_APPLICABLE_TEXT)
    : GENERIC_NOT_APPLICABLE_TEXT;

  return (
    <div className="analysis-mode-tabs">
      {isCheckingMapper && (
        <div className="analysis-mode-tabs-checking" role="status" aria-live="polite">
          Verificando transformações disponíveis...
        </div>
      )}
      {transformationsStatus === 'error' && (
        <div className="analysis-mode-tabs-notice analysis-mode-tabs-notice--error" role="alert">
          A transformação XML deste documento terminou com erro no back-end.
        </div>
      )}

      {/* Estado 2 — parse OK, sem transformação. É AUSÊNCIA ESPERADA, não erro: tom
          informativo (`role="status"`), nunca alarme. Antes disso o caso era silêncio total e
          o usuário não tinha pista nenhuma de por que não havia XML. */}
      {isTransformationNotApplicable && !isCheckingMapper && (
        <div className="analysis-mode-tabs-notice analysis-mode-tabs-notice--info" role="status">
          {notApplicableText}
        </div>
      )}

      {/* Estado 3 — transformação degradada para background. Não há como o front descobrir
          quando (ou se) ela termina, então em vez de prometer conclusão apontamos o caminho
          síncrono que já existe e funciona (botão em XmlTransformationDisplay). */}
      {isTransformationProcessing && (
        <div className="analysis-mode-tabs-notice analysis-mode-tabs-notice--info" role="status">
          {mapperAvailable
            ? 'A transformação deste documento continua sendo processada em segundo plano. Abra a aba "XML Transformação Final" e clique em "Gerar Transformação XML" para obtê-la agora.'
            : 'A transformação deste documento continua sendo processada em segundo plano.'}
        </div>
      )}
      <Tabs
        tabs={tabs}
        activeTab={activeMode || 'txt-posicional'}
        onTabChange={tabId => setActiveMode(tabId as AnalysisMode)}
        className="analysis-mode-tabs-container"
      />
    </div>
  );
};

export default AnalysisModeTabs;
