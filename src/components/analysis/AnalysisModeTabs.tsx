import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import type { AnalysisMode } from '../../store/useTransformationStore';
import { transformationService } from '../../services/api/transformationService';
import Tabs from '../shared/Tabs';
import FieldDisplay from './FieldDisplay';
import StructureTree from './StructureTree';
import XmlTransformationDisplay from './XmlTransformationDisplay';
import './AnalysisModeTabs.css';

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
    setTransformationResult,
    setExecutionError,
  } = useTransformationStore();

  // Ao processar um novo documento (novo parseResult/layout), verificar se existe
  // transformação XML disponível e limpar qualquer resultado de um documento anterior.
  useEffect(() => {
    const layoutGuid = selectedLayout?.layoutGuid;

    if (!parseResult?.success || !layoutGuid) {
      return;
    }

    setTransformationResult(null);
    setExecutionError(null);
    setActiveMode('txt-posicional');
    setMapperAvailable(null);
    setCheckingMapper(true);

    transformationService
      .checkMapperAvailability(layoutGuid)
      .then(result => setMapperAvailable(result.available))
      .catch(error => {
        console.error('Erro ao verificar disponibilidade de transformação XML:', error);
        setMapperAvailable(false);
      })
      .finally(() => setCheckingMapper(false));
  }, [
    parseResult,
    selectedLayout?.layoutGuid,
    setActiveMode,
    setMapperAvailable,
    setCheckingMapper,
    setTransformationResult,
    setExecutionError,
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

  if (mapperAvailable) {
    tabs.push({
      id: 'xml-transformacao',
      label: 'XML Transformação Final',
      content: <XmlTransformationDisplay />,
    });
  }

  return (
    <div className="analysis-mode-tabs">
      {isCheckingMapper && (
        <div className="analysis-mode-tabs-checking" role="status" aria-live="polite">
          Verificando transformações disponíveis...
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
