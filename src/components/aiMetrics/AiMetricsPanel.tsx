import React, { useEffect, useState } from 'react';
import { useAiMetricsStore } from '../../store/useAiMetricsStore';
import './AiMetricsPanel.css';

// Badge neutro para os 3 campos de validação futura (xsdValido/cypressValidado/cStatPollux).
// null = fase do pipeline ainda não implementada -> "Pendente" (cinza), NUNCA vermelho.
const ValidationBadge: React.FC<{ value: boolean | null }> = ({ value }) => {
  if (value === null) {
    return (
      <span
        className="ai-badge ai-badge-pending"
        title="Ainda não avaliado — etapa do pipeline não implementada"
      >
        Pendente
      </span>
    );
  }
  return value ? (
    <span className="ai-badge ai-badge-ok" title="Validado com sucesso">
      OK
    </span>
  ) : (
    <span className="ai-badge ai-badge-fail" title="Validação executada e reprovada">
      Falhou
    </span>
  );
};

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

// Painel de métricas de IA (Gap 3). Contrato antecipado por @lp-architect (Aria) em
// 2026-07-30 — o back-end ainda NÃO implementou /api/ai-metrics/*. Os estados de erro abaixo
// são o comportamento ESPERADO até o back-end subir, por isso são tratados como aviso
// informativo ("indisponível por enquanto"), não como uma tela de erro assustadora.
export const AiMetricsPanel: React.FC = () => {
  const {
    summary,
    isLoadingSummary,
    summaryError,
    generations,
    totalCount,
    isLoadingGenerations,
    generationsError,
    filters,
    fetchSummary,
    fetchGenerations,
    setFilters,
  } = useAiMetricsStore();

  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [modeloFilter, setModeloFilter] = useState('');

  useEffect(() => {
    fetchSummary();
    fetchGenerations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    setFilters({ page: 1 });
    fetchGenerations({
      page: 1,
      layout: docTypeFilter || undefined,
      modelo: modeloFilter || undefined,
    });
  };

  const handlePageChange = (nextPage: number) => {
    fetchGenerations({ page: nextPage });
  };

  const pageSize = filters.pageSize ?? 20;
  const currentPage = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="ai-metrics-container">
      <div className="ai-metrics-header">
        <h2>Métricas de IA</h2>
        <button
          type="button"
          className="ai-refresh-btn"
          onClick={() => {
            fetchSummary();
            fetchGenerations();
          }}
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Aviso: contrato antecipado, back-end ainda não implementou os endpoints */}
      <div className="ai-metrics-notice">
        Painel consumindo o contrato de <code>/api/ai-metrics/*</code> publicado pelo arquiteto — o
        back-end ainda não implementou esses endpoints. Erros abaixo são esperados até lá.
      </div>

      {/* Cards de resumo (Endpoint 2) */}
      {isLoadingSummary && <div className="ai-metrics-loading">Carregando resumo...</div>}

      {summaryError && !isLoadingSummary && (
        <div className="ai-metrics-warning">Resumo indisponível: {summaryError}</div>
      )}

      {summary && !isLoadingSummary && (
        <div className="ai-summary-cards">
          <div className="ai-summary-card">
            <span className="ai-summary-label">Total de Gerações</span>
            <span className="ai-summary-value">{summary.totalGeracoes}</span>
          </div>
          <div className="ai-summary-card">
            <span className="ai-summary-label">Taxa de Sucesso</span>
            <span className="ai-summary-value">
              {summary.totalGeracoes > 0
                ? formatPercent(summary.totalSucesso / summary.totalGeracoes)
                : '—'}
            </span>
          </div>
          <div className="ai-summary-card">
            <span className="ai-summary-label">Tokens/s Médio</span>
            <span className="ai-summary-value">{summary.tokensPorSegundoMedio.toFixed(2)}</span>
          </div>
          <div className="ai-summary-card">
            <span className="ai-summary-label">Tag Overlap Médio</span>
            <span className="ai-summary-value">{formatPercent(summary.tagOverlapMedio)}</span>
          </div>
          <div className="ai-summary-card">
            <span className="ai-summary-label">Similaridade de Texto Média</span>
            <span className="ai-summary-value">{formatPercent(summary.textSimilarityMedia)}</span>
          </div>
          <div className="ai-summary-card">
            <span className="ai-summary-label">XSD Validado</span>
            <span className="ai-summary-value">
              {summary.totalXsdValidado}
              <span className="ai-badge ai-badge-pending">Pendente</span>
            </span>
          </div>
          <div className="ai-summary-card">
            <span className="ai-summary-label">Cypress Validado</span>
            <span className="ai-summary-value">
              {summary.totalCypressValidado}
              <span className="ai-badge ai-badge-pending">Pendente</span>
            </span>
          </div>
          <div className="ai-summary-card">
            <span className="ai-summary-label">cStat Autorizado</span>
            <span className="ai-summary-value">
              {summary.totalCStatAutorizado}
              <span className="ai-badge ai-badge-pending">Pendente</span>
            </span>
          </div>
          <div className="ai-summary-card ai-summary-card-wide">
            <span className="ai-summary-label">Última Rodada</span>
            <span className="ai-summary-value">{formatDate(summary.ultimaRodada)}</span>
          </div>
        </div>
      )}

      {summary && summary.porDocType.length > 0 && (
        <div className="ai-doctype-breakdown">
          <h3>Por Tipo de Documento</h3>
          <div className="ai-doctype-list">
            {summary.porDocType.map(item => (
              <div key={item.docType} className="ai-doctype-item">
                <span className="ai-doctype-name">{item.docType}</span>
                <span>
                  {item.sucesso}/{item.total} sucesso
                </span>
                <span>{item.tokensPorSegundoMedio.toFixed(2)} tok/s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros + tabela de gerações (Endpoint 1) */}
      <div className="ai-generations-filters">
        <input
          type="text"
          placeholder="Filtrar por layout/docType..."
          value={docTypeFilter}
          onChange={e => setDocTypeFilter(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por modelo..."
          value={modeloFilter}
          onChange={e => setModeloFilter(e.target.value)}
        />
        <button type="button" onClick={handleApplyFilters}>
          Filtrar
        </button>
      </div>

      {isLoadingGenerations && <div className="ai-metrics-loading">Carregando gerações...</div>}

      {generationsError && !isLoadingGenerations && (
        <div className="ai-metrics-warning">Lista de gerações indisponível: {generationsError}</div>
      )}

      {!isLoadingGenerations && !generationsError && generations.length === 0 && (
        <div className="ai-metrics-empty">Nenhuma geração encontrada.</div>
      )}

      {!isLoadingGenerations && generations.length > 0 && (
        <>
          <div className="ai-generations-table-wrapper">
            <table className="ai-generations-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Layout</th>
                  <th>Tipo</th>
                  <th>Modelo</th>
                  <th>Tokens/s</th>
                  <th>Duração (s)</th>
                  <th>Tag Overlap</th>
                  <th>Similaridade Texto</th>
                  <th>Sucesso</th>
                  <th>XSD</th>
                  <th>Cypress</th>
                  <th>cStat</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((item, index) => (
                  <tr key={`${item.layout}-${item.timestamp}-${index}`}>
                    <td>{formatDate(item.timestamp)}</td>
                    <td className="ai-cell-layout">{item.layout}</td>
                    <td>{item.docType}</td>
                    <td>{item.modelo}</td>
                    <td>{item.tokensPorSegundo.toFixed(2)}</td>
                    <td>{item.duracaoSegundos.toFixed(1)}</td>
                    <td>{formatPercent(item.tagOverlapRatio)}</td>
                    <td>{formatPercent(item.textSimilarityRatio)}</td>
                    <td>
                      {item.sucesso ? (
                        <span className="ai-badge ai-badge-ok">Sim</span>
                      ) : (
                        <span className="ai-badge ai-badge-fail">Não</span>
                      )}
                    </td>
                    <td>
                      <ValidationBadge value={item.xsdValido} />
                    </td>
                    <td>
                      <ValidationBadge value={item.cypressValidado} />
                    </td>
                    <td>
                      <ValidationBadge value={item.cStatPollux} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ai-generations-pagination">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages} ({totalCount} gerações)
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AiMetricsPanel;
