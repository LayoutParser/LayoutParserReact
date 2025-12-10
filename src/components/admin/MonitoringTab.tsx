import React, { useState, useEffect } from 'react';
import { monitoringService, type MonitoringResponse, type LayoutAnalysis } from '../../services/api/monitoringService';
import './MonitoringTab.css';

const MonitoringTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<LayoutAnalysis | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await monitoringService.getLayoutsAnalysis();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar análise');
      console.error('Erro ao carregar análise:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, []);

  const toggleLineExpansion = (lineName: string) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(lineName)) {
      newExpanded.delete(lineName);
    } else {
      newExpanded.add(lineName);
    }
    setExpandedLines(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      valid: { label: 'Válido', class: 'status-valid' },
      invalid: { label: 'Inválido', class: 'status-invalid' },
      not_configured: { label: 'Não Configurado', class: 'status-not-configured' },
      error: { label: 'Erro', class: 'status-error' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_configured;
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  if (loading) {
    return (
      <div className="monitoring-container">
        <div className="monitoring-loading">
          <div className="loading-spinner"></div>
          <p>Carregando análise de layouts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="monitoring-container">
        <div className="monitoring-error">
          <p>❌ {error}</p>
          <button type="button" onClick={loadAnalysis} className="retry-btn">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="monitoring-container">
        <div className="monitoring-empty">
          <p>Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="monitoring-container">
      <div className="monitoring-header">
        <div className="monitoring-title">
          <h2>Monitoramento de Layouts</h2>
          <button type="button" onClick={loadAnalysis} className="refresh-btn" title="Atualizar análise">
            🔄 Atualizar
          </button>
        </div>
        {data.summary && (
          <div className="monitoring-summary">
            <div className="summary-card">
              <span className="summary-label">Total de Layouts</span>
              <span className="summary-value">{data.summary.totalLayouts}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Válidos</span>
              <span className="summary-value valid">{data.summary.validLayouts}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Inválidos</span>
              <span className="summary-value invalid">{data.summary.invalidLayouts}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Com Erros</span>
              <span className="summary-value error">{data.summary.layoutsWithErrors}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Taxa de Validação</span>
              <span className="summary-value">{data.summary.validationRate.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="monitoring-content">
        <div className="layouts-list">
          <h3>Layouts Analisados ({data.layouts.length})</h3>
          <div className="layouts-grid">
            {data.layouts.map((layout) => (
              <div
                key={layout.layoutGuid}
                className={`layout-card ${layout.status} ${selectedLayout?.layoutGuid === layout.layoutGuid ? 'selected' : ''}`}
                onClick={() => setSelectedLayout(layout)}
              >
                <div className="layout-card-header">
                  <div className="layout-card-title">
                    <h4>{layout.name}</h4>
                    {getStatusBadge(layout.status)}
                  </div>
                  {layout.expectedLineLength && (
                    <span className="layout-line-size">{layout.expectedLineLength} chars</span>
                  )}
                </div>
                <div className="layout-card-body">
                  <div className="layout-stats">
                    <div className="stat-item">
                      <span className="stat-label">Linhas:</span>
                      <span className="stat-value">{layout.totalLines}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Válidas:</span>
                      <span className="stat-value valid">{layout.validLines}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Inválidas:</span>
                      <span className="stat-value invalid">{layout.invalidLines}</span>
                    </div>
                  </div>
                  {layout.error && (
                    <div className="layout-error">
                      <span>⚠️ {layout.error}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedLayout && (
          <div className="layout-details">
            <div className="details-header">
              <h3>Detalhes: {selectedLayout.name}</h3>
              <button
                type="button"
                onClick={() => setSelectedLayout(null)}
                className="close-btn"
                title="Fechar detalhes"
              >
                ✕
              </button>
            </div>
            <div className="details-content">
              <div className="details-info">
                <div className="info-row">
                  <span className="info-label">Layout GUID:</span>
                  <span className="info-value">{selectedLayout.layoutGuid}</span>
                </div>
                {selectedLayout.description && (
                  <div className="info-row">
                    <span className="info-label">Descrição:</span>
                    <span className="info-value">{selectedLayout.description}</span>
                  </div>
                )}
                {selectedLayout.layoutType && (
                  <div className="info-row">
                    <span className="info-label">Tipo:</span>
                    <span className="info-value">{selectedLayout.layoutType}</span>
                  </div>
                )}
                {selectedLayout.expectedLineLength && (
                  <div className="info-row">
                    <span className="info-label">Tamanho Esperado:</span>
                    <span className="info-value">{selectedLayout.expectedLineLength} caracteres</span>
                  </div>
                )}
              </div>

              <div className="line-validations">
                <h4>Validações de Linhas ({selectedLayout.lineValidations.length})</h4>
                <div className="validations-list">
                  {selectedLayout.lineValidations.map((line) => (
                    <div
                      key={line.lineName}
                      className={`validation-item ${line.isValid ? 'valid' : 'invalid'}`}
                    >
                      <div
                        className="validation-header"
                        onClick={() => toggleLineExpansion(line.lineName)}
                      >
                        <span className="validation-toggle">
                          {expandedLines.has(line.lineName) ? '▼' : '▶'}
                        </span>
                        <span className="validation-line-name">{line.lineName}</span>
                        {getStatusBadge(line.isValid ? 'valid' : 'invalid')}
                        <span className="validation-total">{line.totalLength} chars</span>
                      </div>
                      {expandedLines.has(line.lineName) && (
                        <div className="validation-details">
                          <div className="validation-formula">
                            <div className="formula-item">
                              <span>InitialValue:</span>
                              <span>{line.initialValue} ({line.initialValueLength} chars)</span>
                            </div>
                            <div className="formula-item">
                              <span>Sequencia Anterior:</span>
                              <span>{line.sequenceFromPreviousLine} chars</span>
                            </div>
                            <div className="formula-item">
                              <span>Campos:</span>
                              <span>{line.fieldsLength} chars ({line.fieldCount} campos)</span>
                            </div>
                            <div className="formula-item">
                              <span>Sequencia Própria:</span>
                              <span>{line.sequenciaLength} chars</span>
                            </div>
                            <div className="formula-total">
                              <span>Total:</span>
                              <span>{line.totalLength} chars</span>
                            </div>
                          </div>
                          {line.calculatedPositions && Object.keys(line.calculatedPositions).length > 0 && (
                            <div className="calculated-positions">
                              <h5>Posições Calculadas ({Object.keys(line.calculatedPositions).length} campos)</h5>
                              <div className="positions-grid">
                                {Object.entries(line.calculatedPositions)
                                  .slice(0, 20)
                                  .map(([fieldName, position]) => (
                                    <div key={fieldName} className="position-item">
                                      <span className="position-field">{fieldName}:</span>
                                      <span className="position-value">Pos {position}</span>
                                    </div>
                                  ))}
                                {Object.keys(line.calculatedPositions).length > 20 && (
                                  <div className="position-more">
                                    +{Object.keys(line.calculatedPositions).length - 20} campos
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringTab;

