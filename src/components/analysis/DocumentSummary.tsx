import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { resolveDocumentHealth } from '../../utils/documentHealth';
import './DocumentSummary.css';

const DocumentSummary: React.FC = () => {
  const { parseResult, fields, txtContent } = useAppStore();

  if (!parseResult || !parseResult.success) {
    return null;
  }

  // Usar campos do parseResult se fields estiver vazio
  const actualFields = fields.length > 0 ? fields : parseResult.fields || [];

  const totalFields = actualFields.length;
  const totalLines = actualFields.length > 0 ? new Set(actualFields.map(f => f.lineName)).size : 0;
  const totalChars = txtContent.length;

  // Terceiro estado do parse (200 com defeito): o resumo é o primeiro bloco que o usuário lê
  // depois de processar, então "processado" sem ressalva ali seria enganoso quando há defeito.
  const health = resolveDocumentHealth(parseResult);

  return (
    <div className="document-summary">
      <div className="summary-item">
        <span className="summary-label">Tipo:</span>
        <span className="summary-value">{parseResult.detectedType || 'N/A'}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Situação:</span>
        <span
          className={`summary-value summary-value--health summary-value--health-${health === 'has_defects' ? 'defects' : 'clean'}`}
        >
          {health === 'has_defects' ? 'Com defeitos' : 'Sem defeitos'}
        </span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Campos:</span>
        <span className="summary-value">{totalFields}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Linhas:</span>
        <span className="summary-value">{totalLines}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Tamanho:</span>
        <span className="summary-value">{totalChars.toLocaleString()} chars</span>
      </div>
    </div>
  );
};

export default DocumentSummary;
