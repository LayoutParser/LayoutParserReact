import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import type { AnalysisMode } from '../../store/useTransformationStore';
import Tabs from '../shared/Tabs';
import FieldDisplay from './FieldDisplay';
import StructureTree from './StructureTree';
import XmlTransformationDisplay from './XmlTransformationDisplay';
import type { ParseResponse } from '../../types/api';
import './AnalysisModeTabs.css';

type TransformationReason = NonNullable<ParseResponse['transformationsReason']>;

/**
 * Texto do banner quando o parse deu certo mas NÃO há transformação XML.
 *
 * `transformationsReason` é aditivo/opcional para manter compatibilidade com versões antigas da
 * API. Quando estiver ausente, a UI cai no texto genérico; nunca tenta inferir a causa apenas por
 * `transformationsStatus`, porque `not_applicable` agrega diferentes cenários.
 */
const NOT_APPLICABLE_TEXT: Record<TransformationReason, string> = {
  no_mapper:
    'Sysmiddle: nenhum mapeador low-code cadastrado para este layout. O caminho TCL/XSL ainda pode ser avaliado na aba de transformação.',
  type_not_positional: 'O tipo detectado deste documento não entra no pathway de transformação.',
  empty_input: 'Documento sem conteúdo para transformar.',
  timeout_sync: 'A transformação não foi concluída no tempo previsto durante o processamento.',
  structural_error: 'A estrutura deste documento impediu a geração da transformação.',
};

const GENERIC_NOT_APPLICABLE_TEXT = 'Não há transformação XML disponível para este documento.';

/**
 * Alterna entre as duas formas de apresentar o documento processado:
 * - "TXT Posicional": visualização posicional já existente (FieldDisplay + StructureTree).
 * - "XML Transformação Final": aparece após qualquer parse bem-sucedido e avalia, sob demanda,
 *   os dois pathways independentes expostos pelo back-end: Sysmiddle e TCL/XSL.
 *
 * A existência de mapper Sysmiddle NÃO pode bloquear a aba: o pathway TCL/XSL não depende
 * desse cadastro e só é avaliado por `execute-candidates`.
 */
const AnalysisModeTabs: React.FC = () => {
  const { parseResult } = useAppStore();
  const { activeMode, setActiveMode, clearCandidates, setDiagnostic, setDiagnosticError } =
    useTransformationStore();

  // Ao processar um novo documento, limpar qualquer resultado do documento anterior.
  // A disponibilidade dos dois pathways é avaliada pela chamada multi-candidato, não por
  // uma consulta exclusiva ao catálogo Sysmiddle.
  useEffect(() => {
    if (!parseResult?.success) {
      return;
    }

    clearCandidates();
    setDiagnostic(null);
    setDiagnosticError(null);
    setActiveMode('txt-posicional');
  }, [parseResult, setActiveMode, clearCandidates, setDiagnostic, setDiagnosticError]);

  if (!parseResult || !parseResult.success) {
    return null;
  }

  const tabs = [
    {
      id: 'txt-posicional',
      label: 'TXT Posicional',
      content: (
        <div className="file-visualization">
          <div className="file-visualization-header">
            <StructureTree />
          </div>
          <div className="file-visualization-content">
            <FieldDisplay />
          </div>
        </div>
      ),
    },
  ];

  // Este status descreve apenas a tentativa automática associada ao parse. Ele não informa
  // o resultado da avaliação multi-candidato feita pela aba.
  const transformationsStatus = parseResult.transformationsStatus;
  const isTransformationNotApplicable = transformationsStatus === 'not_applicable';

  tabs.push({
    id: 'xml-transformacao',
    label: 'XML Transformação Final',
    content: <XmlTransformationDisplay />,
  });

  const notApplicableText = parseResult.transformationsReason
    ? (NOT_APPLICABLE_TEXT[parseResult.transformationsReason] ?? GENERIC_NOT_APPLICABLE_TEXT)
    : GENERIC_NOT_APPLICABLE_TEXT;

  return (
    <div className="analysis-mode-tabs">
      {transformationsStatus === 'error' && (
        <div className="analysis-mode-tabs-notice analysis-mode-tabs-notice--error" role="alert">
          A avaliação automática do caminho Sysmiddle terminou com erro. A aba de transformação
          ainda pode avaliar TCL/XSL e informar o diagnóstico de cada caminho.
        </div>
      )}

      {/* Estado 2 — parse OK, sem transformação. É AUSÊNCIA ESPERADA, não erro: tom
          informativo (`role="status"`), nunca alarme. Antes disso o caso era silêncio total e
          o usuário não tinha pista nenhuma de por que não havia XML. */}
      {isTransformationNotApplicable && (
        <div className="analysis-mode-tabs-notice analysis-mode-tabs-notice--info" role="status">
          {notApplicableText}
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
