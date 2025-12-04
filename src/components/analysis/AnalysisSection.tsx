import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFieldStore } from '../../store/useFieldStore';
import StructureTree from './StructureTree';
import FieldDisplay from './FieldDisplay';
import DocumentSummary from './DocumentSummary';
import FieldSearch from './FieldSearch';
import FieldProperties from './FieldProperties';
import LineProperties from './LineProperties';
import './AnalysisSection.css';

const AnalysisSection: React.FC = () => {
  const { parseResult, fields } = useAppStore();
  const { setFields } = useFieldStore();

  // Sincronizar campos do parseResult com o useFieldStore
  useEffect(() => {
    if (parseResult?.fields && parseResult.fields.length > 0) {
      console.log('🔄 Sincronizando campos no AnalysisSection:', parseResult.fields.length);
      setFields(parseResult.fields);
    } else {
      console.warn('⚠️ AnalysisSection: Nenhum campo no parseResult');
      setFields([]);
    }
  }, [parseResult, setFields]);

  if (!parseResult || !parseResult.success) {
    return (
      <div className="analysis-placeholder">
        <h3>Análise & Estrutura</h3>
        <p>Processe um documento primeiro para visualizar a análise e estrutura.</p>
      </div>
    );
  }

  return (
    <div className="analysis-section">
      <div className="analysis-header">
        <h2>Análise & Estrutura do Documento</h2>
        <DocumentSummary />
      </div>

      <div className="analysis-content">
        <div className="analysis-main">
          <div className="analysis-left">
            <FieldSearch />
            <StructureTree />
          </div>
          
          <div className="analysis-right">
            <FieldDisplay />
          </div>
        </div>

        <FieldProperties />
        <LineProperties />
      </div>
    </div>
  );
};

export default AnalysisSection;

