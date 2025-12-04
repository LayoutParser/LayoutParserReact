import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import './DocumentSummary.css';

const DocumentSummary: React.FC = () => {
  const { parseResult, fields, txtContent } = useAppStore();

  if (!parseResult || !parseResult.success) {
    return null;
  }

  const totalFields = fields.length;
  const totalLines = new Set(fields.map(f => f.lineName)).size;
  const totalChars = txtContent.length;

  return (
    <div className="document-summary">
      <div className="summary-item">
        <span className="summary-label">Tipo:</span>
        <span className="summary-value">{parseResult.detectedType || 'N/A'}</span>
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

