import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFieldCorrectionCurationStore } from '../../../store/useFieldCorrectionCurationStore';
import type { FieldCorrectionReport } from '../../../types/fieldCorrectionCuration';
import './FieldCorrectionCuration.css';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

const formatDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
};

const statusLabels: Record<FieldCorrectionReport['status'], string> = {
  pending: 'Pendente',
  reviewed_accepted: 'Aceita',
  reviewed_rejected: 'Rejeitada',
};

/**
 * Tela de curadoria (Story #244): o curador/revisor decide aceitar ou rejeitar cada correção de
 * campo reportada pelo analista fiscal (#232/#234) antes que ela alimente o dataset de treino de
 * IA. Só a decisão "aceitar" resultando em status `reviewed_accepted` entra no treino.
 */
const FieldCorrectionCuration = () => {
  const { status, reports, reviewing, error, loadPending, decide } =
    useFieldCorrectionCurationStore();

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  if (status === 'idle' || status === 'loading') {
    return (
      <main
        className="field-correction-curation field-correction-curation--state"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="field-correction-curation__spinner" aria-hidden="true" />
        <h1>Carregando fila de correções…</h1>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="field-correction-curation field-correction-curation--state">
        <section role="alert">
          <p className="field-correction-curation__eyebrow">Fila indisponível</p>
          <h1>Não foi possível carregar a curadoria</h1>
          <p>{error || 'A API não respondeu à fila de correções de campo.'}</p>
          <button type="button" onClick={() => void loadPending()}>
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="field-correction-curation">
      <nav className="field-correction-curation__breadcrumb" aria-label="Navegação">
        <Link to="/workspace">Workspace</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Curadoria de correções de campo</span>
      </nav>

      <header className="field-correction-curation__header">
        <p className="field-correction-curation__eyebrow">Curadoria de correções de campo</p>
        <h1>Revise divergências antes do dataset de treino</h1>
        <p>
          Apenas correções <strong>aceitas</strong> alimentam o dataset de treino de IA. Correções
          rejeitadas ficam registradas, mas não entram no treinamento.
        </p>
      </header>

      {error && (
        <p className="field-correction-curation__error" role="alert">
          {error}
        </p>
      )}

      {reports.length === 0 ? (
        <div className="field-correction-curation__empty">
          <h2>Nenhuma correção pendente</h2>
          <p>Quando o analista fiscal reportar uma divergência de campo, ela aparecerá aqui.</p>
        </div>
      ) : (
        <ul className="field-correction-curation__list" aria-label="Correções de campo">
          {reports.map(report => {
            const isReviewing = Boolean(reviewing[report.reportId]);
            const isDecided = report.status !== 'pending';

            return (
              <li key={report.reportId} className="field-correction-curation__item">
                <div className="field-correction-curation__item-main">
                  <code>{report.nodePath}</code>
                  <span className="field-correction-curation__status" data-status={report.status}>
                    {statusLabels[report.status]}
                  </span>
                </div>

                <div className="field-correction-curation__values">
                  <div>
                    <span>Valor original</span>
                    <strong>{report.originalValue}</strong>
                  </div>
                  <div>
                    <span>Valor corrigido</span>
                    <strong>{report.correctedValue}</strong>
                  </div>
                </div>

                {report.comment && (
                  <p className="field-correction-curation__comment">{report.comment}</p>
                )}

                <div className="field-correction-curation__item-meta">
                  <span>Documento {report.documentId}</span>
                  <span>Reportado em {formatDate(report.reportedAt)}</span>
                  {report.reportedBy && <span>por {report.reportedBy}</span>}
                </div>

                <div className="field-correction-curation__actions">
                  <button
                    type="button"
                    className="field-correction-curation__button field-correction-curation__button--accept"
                    disabled={isDecided || isReviewing}
                    onClick={() => void decide(report.reportId, 'accepted')}
                  >
                    {isReviewing ? 'Enviando…' : 'Aceitar'}
                  </button>
                  <button
                    type="button"
                    className="field-correction-curation__button field-correction-curation__button--reject"
                    disabled={isDecided || isReviewing}
                    onClick={() => void decide(report.reportId, 'rejected')}
                  >
                    {isReviewing ? 'Enviando…' : 'Rejeitar'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
};

export default FieldCorrectionCuration;
