import React, { useState, useEffect } from 'react';
import { monitoringService, type LayoutValidationsResponse, type LayoutValidation } from '../../services/api/monitoringService';
import './LayoutValidationTab.css';

const LayoutValidationTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LayoutValidationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<LayoutValidation | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const loadValidations = async (forceRevalidation: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await monitoringService.getLayoutValidations(forceRevalidation);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar validações');
      console.error('Erro ao carregar validações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidations();
  }, []);

  const toggleErrorExpansion = (layoutGuid: string, lineName: string) => {
    const key = `${layoutGuid}_${lineName}`;
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedErrors(newExpanded);
  };

  const getStatusBadge = (isValid: boolean) => {
    if (isValid) {
      return <span className="status-badge status-valid">Válido</span>;
    }
    return <span className="status-badge status-invalid">Inválido</span>;
  };

  if (loading) {
    return (
      <div className="validation-container">
        <div className="validation-loading">
          <div className="loading-spinner"></div>
          <p>Carregando validações de layouts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="validation-container">
        <div className="validation-error">
          <p>❌ {error}</p>
          <button type="button" onClick={() => loadValidations()} className="retry-btn">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="validation-container">
        <div className="validation-empty">
          <p>Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  // Filtrar apenas layouts com erros para exibição principal
  const layoutsWithErrors = data.validations.filter(v => !v.isValid);
  const validLayouts = data.validations.filter(v => v.isValid);

  return (
    <div className="validation-container">
      <div className="validation-header">
        <div className="validation-title">
          <h2>Validação de Layouts</h2>
          <div className="validation-actions">
            <button
              type="button"
              onClick={() => loadValidations(false)}
              className="refresh-btn"
              title="Atualizar validações"
            >
              🔄 Atualizar
            </button>
            <button
              type="button"
              onClick={() => loadValidations(true)}
              className="force-refresh-btn"
              title="Forçar revalidação"
            >
              🔄 Forçar Revalidação
            </button>
          </div>
        </div>
        {data.summary && (
          <div className="validation-summary">
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
              <span className="summary-label">Total de Erros</span>
              <span className="summary-value error">{data.summary.totalErrors}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Taxa de Validação</span>
              <span className="summary-value">{data.summary.validationRate.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="validation-content">
        {/* Layouts com Erros */}
        {layoutsWithErrors.length > 0 && (
          <div className="validation-section">
            <h3 className="section-title error-title">
              ⚠️ Layouts com Erros ({layoutsWithErrors.length})
            </h3>
            <div className="layouts-grid">
              {layoutsWithErrors.map((layout) => (
                <div
                  key={layout.layoutGuid}
                  className={`layout-card invalid ${selectedLayout?.layoutGuid === layout.layoutGuid ? 'selected' : ''}`}
                  onClick={() => setSelectedLayout(layout)}
                >
                  <div className="layout-card-header">
                    <div className="layout-card-title">
                      <h4>{layout.layoutName}</h4>
                      {getStatusBadge(layout.isValid)}
                    </div>
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
                      <div className="stat-item">
                        <span className="stat-label">Erros:</span>
                        <span className="stat-value error">{layout.errors.length}</span>
                      </div>
                    </div>
                    <div className="layout-guid">
                      <span className="guid-label">GUID:</span>
                      <span className="guid-value">{layout.layoutGuid}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Layouts Válidos (colapsável) */}
        {validLayouts.length > 0 && (
          <div className="validation-section">
            <details className="valid-layouts-section">
              <summary className="section-title valid-title">
                ✅ Layouts Válidos ({validLayouts.length})
              </summary>
              <div className="layouts-grid">
                {validLayouts.map((layout) => (
                  <div
                    key={layout.layoutGuid}
                    className={`layout-card valid ${selectedLayout?.layoutGuid === layout.layoutGuid ? 'selected' : ''}`}
                    onClick={() => setSelectedLayout(layout)}
                  >
                    <div className="layout-card-header">
                      <div className="layout-card-title">
                        <h4>{layout.layoutName}</h4>
                        {getStatusBadge(layout.isValid)}
                      </div>
                    </div>
                    <div className="layout-card-body">
                      <div className="layout-stats">
                        <div className="stat-item">
                          <span className="stat-label">Linhas:</span>
                          <span className="stat-value">{layout.totalLines}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Todas Válidas</span>
                        </div>
                      </div>
                      <div className="layout-guid">
                        <span className="guid-label">GUID:</span>
                        <span className="guid-value">{layout.layoutGuid}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* Detalhes do Layout Selecionado */}
        {selectedLayout && (
          <div className="layout-details">
            <div className="details-header">
              <h3>Detalhes: {selectedLayout.layoutName}</h3>
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
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className="info-value">{getStatusBadge(selectedLayout.isValid)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Total de Linhas:</span>
                  <span className="info-value">{selectedLayout.totalLines}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Linhas Válidas:</span>
                  <span className="info-value valid">{selectedLayout.validLines}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Linhas Inválidas:</span>
                  <span className="info-value invalid">{selectedLayout.invalidLines}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Última Validação:</span>
                  <span className="info-value">
                    {new Date(selectedLayout.validatedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Lista de Erros */}
              {selectedLayout.errors.length > 0 && (
                <div className="errors-list">
                  <h4>Erros Encontrados ({selectedLayout.errors.length})</h4>
                  <div className="errors-container">
                    {selectedLayout.errors.map((error, index) => {
                      const errorKey = `${selectedLayout.layoutGuid}_${error.lineName}`;
                      const isExpanded = expandedErrors.has(errorKey);
                      return (
                        <div key={index} className={`error-item ${isExpanded ? 'expanded' : ''}`}>
                          <div
                            className="error-header"
                            onClick={() => toggleErrorExpansion(selectedLayout.layoutGuid, error.lineName)}
                          >
                            <span className="error-toggle">{isExpanded ? '▼' : '▶'}</span>
                            <span className="error-line-name">{error.lineName}</span>
                            <span className="error-badge">Erro</span>
                            <span className="error-summary">
                              {error.actualLength} chars (esperado: {error.expectedLength})
                            </span>
                          </div>
                          {isExpanded && (
                            <div className="error-details">
                              <div className="error-detail-row">
                                <span className="error-detail-label">Tamanho Esperado:</span>
                                <span className="error-detail-value">{error.expectedLength} caracteres</span>
                              </div>
                              <div className="error-detail-row">
                                <span className="error-detail-label">Tamanho Atual:</span>
                                <span className="error-detail-value">{error.actualLength} caracteres</span>
                              </div>
                              <div className="error-detail-row">
                                <span className="error-detail-label">Diferença:</span>
                                <span className={`error-detail-value ${error.difference > 0 ? 'missing' : 'excess'}`}>
                                  {error.difference > 0 ? '+' : ''}{error.difference} caracteres
                                  {error.difference > 0 ? ' (faltam)' : ' (sobram)'}
                                </span>
                              </div>
                              {error.initialValue && (
                                <div className="error-detail-row">
                                  <span className="error-detail-label">Initial Value:</span>
                                  <span className="error-detail-value">{error.initialValue}</span>
                                </div>
                              )}
                              <div className="error-detail-row">
                                <span className="error-detail-label">Número de Campos:</span>
                                <span className="error-detail-value">{error.fieldCount}</span>
                              </div>
                              <div className="error-detail-row">
                                <span className="error-detail-label">Tem Linhas Filhas:</span>
                                <span className="error-detail-value">{error.hasChildren ? 'Sim' : 'Não'}</span>
                              </div>
                              <div className="error-message">
                                <strong>Mensagem de Erro:</strong>
                                <p>{error.errorMessage}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedLayout.errors.length === 0 && (
                <div className="no-errors">
                  <p>✅ Nenhum erro encontrado neste layout. Todas as linhas estão corretas!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutValidationTab;

