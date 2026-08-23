import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import { transformationService } from '../../services/api/transformationService';
import { logService } from '../../services/api/logService';
import {
  DiagnoseValidationErrorException,
  xmlAnalysisService,
} from '../../services/api/xmlAnalysisService';
import { resolveLayoutGuid } from '../../utils/layoutGuid';
import { copyTextToClipboard, createXmlFileName } from '../../utils/xmlDelivery';
import { buildTransformationDiagnostics } from '../../utils/transformationDiagnostics';
import { extractAiFallbackTicket } from '../../utils/aiFallback';
import { useAiFallbackPolling } from '../../hooks/useAiFallbackPolling';
import XmlTree from './XmlTree';
import './XmlTransformationDisplay.css';

const PATHWAY_LABEL: Record<string, string> = {
  sysmiddle: 'Sysmiddle',
  'tcl-xsl': 'TCL/XSL',
};

/**
 * Diferenciador visual entre candidatos do MESMO pathway (ex.: dois candidatos "sysmiddle").
 *
 * ⚠️ Bloqueio de contrato: `TransformationCandidate` (src/types/transformation.ts) não expõe
 * nome amigável do Mapeador nem `layoutOutputTarget` — só `candidateId`, que por convenção do
 * back-end (ver doc do tipo) é "sysmiddle-{MapperGuid}" ou "tclxsl-1". Sem esses campos no
 * contrato, o máximo que dá pra mostrar sem inventar dado é um recorte curto do próprio
 * `candidateId` (o GUID do mapper), só para o usuário distinguir as abas — não é um nome
 * legível. Pedir à API `mapperName`/`layoutOutputTarget` em `execute-candidates` resolveria de
 * verdade; até lá, este é o diferenciador possível.
 */
const buildCandidateDifferentiator = (candidateId: string, pathway: string): string | null => {
  const prefix = `${pathway}-`;
  const suffix = candidateId.startsWith(prefix) ? candidateId.slice(prefix.length) : candidateId;
  const trimmed = suffix.trim();
  if (!trimmed || trimmed === candidateId) return null;
  // GUID de mapper: mostrar só os 8 primeiros caracteres para não estourar o botão.
  return trimmed.length > 8 ? `${trimmed.slice(0, 8)}…` : trimmed;
};

interface XmlDeliveryFeedback {
  kind: 'success' | 'error';
  message: string;
}

/**
 * Exibe o resultado da "XML Transformação Final": o back-end valida o input e devolve o(s)
 * XML(s) transformado(s) — hoje via multi-candidato (`execute-candidates`), que substitui a
 * chamada de candidato único. Este componente só dispara as chamadas e renderiza o retorno
 * (front é só apresentação — nenhuma transformação roda aqui).
 *
 * Disparo é via botão explícito (não automático ao abrir a aba), já que a transformação
 * pode ser custosa no back-end.
 */
const XmlTransformationDisplay: React.FC = () => {
  const { selectedLayout, txtContent, parseResult } = useAppStore();
  const [deliveryFeedback, setDeliveryFeedback] = useState<XmlDeliveryFeedback | null>(null);
  const {
    isLoadingCandidates,
    hasEvaluatedCandidates,
    candidatesError,
    candidates,
    candidatesWarnings,
    activeCandidateId,
    setLoadingCandidates,
    setCandidatesError,
    setCandidatesResult,
    setActiveCandidateId,
    isDiagnosing,
    diagnosticError,
    diagnostic,
    setDiagnosing,
    setDiagnosticError,
    setDiagnostic,
  } = useTransformationStore();

  // Sem ordenação por score (back-end ainda não preenche de verdade): candidato ativo é o
  // selecionado pelo usuário ou, por padrão, o primeiro do array.
  const activeCandidate = useMemo(
    () => candidates.find(c => c.candidateId === activeCandidateId) ?? candidates[0] ?? null,
    [candidates, activeCandidateId]
  );

  const transformationDiagnostics = useMemo(
    () => buildTransformationDiagnostics(candidatesWarnings),
    [candidatesWarnings]
  );

  // Sinal de fallback automático de IA (issue #140): a API não devolve um campo estruturado
  // dedicado, então o ticket é extraído do texto livre em `warnings`. `null` cobre tanto "sem
  // fallback" quanto "cooldown suprimido"/"falha de pathway" (nenhum dos dois gera ticket).
  const aiFallbackTicket = useMemo(
    () => (candidates.length === 0 ? extractAiFallbackTicket(candidatesWarnings) : null),
    [candidates.length, candidatesWarnings]
  );
  const aiFallback = useAiFallbackPolling(aiFallbackTicket);

  const handleGenerate = async () => {
    if (!selectedLayout || !txtContent) {
      setCandidatesError('Documento processado ou layout selecionado não encontrado.');
      return;
    }

    setLoadingCandidates(true);
    setCandidatesError(null);
    setDiagnostic(null);
    setDiagnosticError(null);
    setDeliveryFeedback(null);

    try {
      // O GUID do parse é autoritativo: há layouts legados cujo registro resumido do catálogo
      // contém Guid.Empty, enquanto o layout efetivamente processado devolve um LAY_* válido.
      const layoutGuid = resolveLayoutGuid(
        parseResult?.layout?.layoutGuid,
        selectedLayout.layoutGuid
      );

      const result = await transformationService.executeTransformationCandidates({
        inputContent: txtContent,
        layoutName: selectedLayout.name,
        layoutGuid: layoutGuid ?? null,
        sourceDocumentType: '',
        targetDocumentType: '',
        validate: true,
        expectedOutput: '',
      });

      setCandidatesResult(result.candidates, result.warnings);

      if (result.candidates.length === 0) {
        logService.warn('Nenhum candidato de transformação XML gerado', {
          layoutName: selectedLayout.name,
          warnings: result.warnings,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido ao gerar transformação XML';
      setCandidatesError(message);
      setCandidatesResult([], []);
      logService.error('Erro de infraestrutura ao executar transformação XML (multi-candidato)', {
        layoutName: selectedLayout.name,
        error: message,
      });
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleCopyXml = async () => {
    if (!activeCandidate?.transformedXml) {
      setDeliveryFeedback({ kind: 'error', message: 'Não há XML transformado para copiar.' });
      return;
    }

    try {
      // Copiar sempre o valor bruto da API — a árvore existe apenas para leitura na tela.
      await copyTextToClipboard(activeCandidate.transformedXml);
      setDeliveryFeedback({
        kind: 'success',
        message: 'XML bruto copiado para a área de transferência.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível copiar o XML.';
      setDeliveryFeedback({ kind: 'error', message });
    }
  };

  const handleDownloadXml = () => {
    if (!activeCandidate?.transformedXml) {
      setDeliveryFeedback({ kind: 'error', message: 'Não há XML transformado para baixar.' });
      return;
    }

    try {
      // O Blob recebe o XML bruto retornado pela API; a versão indentada nunca é exportada.
      const blob = new Blob([activeCandidate.transformedXml], {
        type: 'application/xml',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = createXmlFileName(
        selectedLayout?.name ?? 'transformacao',
        activeCandidate.candidateId
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDeliveryFeedback({ kind: 'success', message: 'Download do XML bruto iniciado.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível baixar o XML.';
      setDeliveryFeedback({ kind: 'error', message });
    }
  };

  const handleCopyAiXml = async (transformedXml: string | undefined) => {
    if (!transformedXml) {
      setDeliveryFeedback({ kind: 'error', message: 'Não há XML transformado para copiar.' });
      return;
    }

    try {
      await copyTextToClipboard(transformedXml);
      setDeliveryFeedback({
        kind: 'success',
        message: 'XML bruto (sugestão de IA) copiado para a área de transferência.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível copiar o XML.';
      setDeliveryFeedback({ kind: 'error', message });
    }
  };

  const handleDownloadAiXml = (transformedXml: string | undefined) => {
    if (!transformedXml) {
      setDeliveryFeedback({ kind: 'error', message: 'Não há XML transformado para baixar.' });
      return;
    }

    try {
      const blob = new Blob([transformedXml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = createXmlFileName(selectedLayout?.name ?? 'transformacao', 'ia-sugestao');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDeliveryFeedback({
        kind: 'success',
        message: 'Download do XML bruto (sugestão de IA) iniciado.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível baixar o XML.';
      setDeliveryFeedback({ kind: 'error', message });
    }
  };

  const handleDiagnose = async () => {
    if (!activeCandidate?.failureReason) {
      return;
    }

    setDiagnosing(true);
    setDiagnosticError(null);
    setDiagnostic(null);

    try {
      const result = await xmlAnalysisService.diagnoseValidationError({
        errorMessage: activeCandidate.failureReason,
        fieldName: null,
        mqSeriesSegment: null,
        documentType: selectedLayout?.name ?? null,
        transformedXml: activeCandidate.transformedXml || null,
      });
      setDiagnostic(result.diagnostic);
    } catch (error) {
      if (error instanceof DiagnoseValidationErrorException) {
        setDiagnosticError({ status: error.status, message: error.message });
        logService.error('Falha ao diagnosticar erro de validação via IA', {
          status: error.status,
          message: error.message,
        });
      } else {
        const message =
          error instanceof Error ? error.message : 'Erro desconhecido ao diagnosticar';
        setDiagnosticError({ status: 500, message });
        logService.error('Erro de infraestrutura ao diagnosticar erro de validação via IA', {
          error: message,
        });
      }
    } finally {
      setDiagnosing(false);
    }
  };

  return (
    <div className="xml-transformation-display">
      <div className="xml-transformation-actions">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoadingCandidates}
          aria-busy={isLoadingCandidates}
          className="xml-transformation-generate-btn"
        >
          {isLoadingCandidates ? 'Gerando transformação...' : 'Gerar Transformação XML'}
        </button>
      </div>

      {candidatesError && (
        <div className="xml-transformation-error" role="alert">
          ❌ {candidatesError}
        </div>
      )}

      {!isLoadingCandidates &&
        !candidatesError &&
        hasEvaluatedCandidates &&
        candidates.length === 0 && (
          <div
            className="xml-transformation-empty"
            role="region"
            aria-labelledby="transformation-empty-title"
            aria-live="polite"
          >
            <p className="xml-transformation-empty-eyebrow">Diagnóstico de transformação</p>
            <h3 id="transformation-empty-title">Nenhum candidato foi encontrado</h3>
            <p className="xml-transformation-empty-summary">
              A API avaliou os dois caminhos disponíveis. Veja abaixo o motivo informado para cada
              um.
            </p>

            <div className="xml-transformation-pathway-grid">
              {transformationDiagnostics.pathways.map(pathway => (
                <section
                  key={pathway.pathway}
                  className="xml-transformation-pathway-diagnostic"
                  aria-label={`Diagnóstico ${pathway.label}`}
                >
                  <div className="xml-transformation-pathway-heading">
                    <h4>{pathway.label}</h4>
                    <span>Não gerado</span>
                  </div>
                  {pathway.reasons.length > 0 ? (
                    <ul>
                      {pathway.reasons.map(reason => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      O back-end não informou uma causa específica para este caminho. Esse dado
                      precisa ser detalhado pela API para permitir um diagnóstico conclusivo.
                    </p>
                  )}
                </section>
              ))}
            </div>

            {transformationDiagnostics.generalWarnings.length > 0 && (
              <div className="xml-transformation-general-warnings">
                <h4>Contexto adicional da API</h4>
                <ul>
                  {transformationDiagnostics.generalWarnings.map(warning => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiFallbackTicket && (
              <div
                className="xml-transformation-ai-fallback"
                role="region"
                aria-label="Fallback automático de IA"
                aria-live="polite"
              >
                {aiFallback.status === 'running' && (
                  <p className="xml-transformation-ai-fallback-running" role="status">
                    A IA está gerando uma sugestão de transformação em segundo plano (sem mapper
                    Sysmiddle cadastrado para este layout). Isso pode levar minutos — a consulta de
                    status é feita automaticamente em segundo plano.
                  </p>
                )}

                {aiFallback.status === 'failed' && (
                  <div className="xml-transformation-error" role="alert">
                    ❌ A geração via IA falhou
                    {aiFallback.diagnostics?.lastError
                      ? `: ${aiFallback.diagnostics.lastError}`
                      : '.'}
                  </div>
                )}

                {aiFallback.status === 'not-applicable' && (
                  <p className="xml-transformation-ai-fallback-empty" role="status">
                    A IA avaliou este documento e não conseguiu propor uma transformação aplicável.
                  </p>
                )}

                {aiFallback.status === 'not-found' && (
                  <p className="xml-transformation-ai-fallback-empty" role="status">
                    O ticket do fallback de IA não foi encontrado (pode ter expirado — tickets ficam
                    disponíveis por até 72h após concluir).
                  </p>
                )}

                {aiFallback.error && (
                  <p className="xml-transformation-ai-fallback-poll-error" role="status">
                    ⚠️ Falha ao consultar o status da IA, tentando novamente em segundo plano:{' '}
                    {aiFallback.error}
                  </p>
                )}

                {aiFallback.status === 'converged' && aiFallback.candidate && (
                  <div
                    className="xml-transformation-ai-candidate"
                    role="region"
                    aria-label="Sugestão de transformação gerada por IA"
                  >
                    <div className="xml-transformation-ai-candidate-heading">
                      <h4>Sugestão de transformação (IA)</h4>
                      {aiFallback.diagnostics?.hasGroundTruth === false ? (
                        <span
                          className="xml-transformation-ai-badge xml-transformation-ai-badge--suggestion"
                          title="Convergência sem gabarito real (nenhum mapper Sysmiddle cadastrado) — apenas XSD válido + validação de negócio. Requer revisão humana antes de qualquer uso em produção."
                        >
                          Sugestão de IA — requer revisão humana
                        </span>
                      ) : (
                        <span className="xml-transformation-ai-badge xml-transformation-ai-badge--validated">
                          Validado contra gabarito
                        </span>
                      )}
                    </div>

                    {aiFallback.diagnostics?.hasGroundTruth === false && (
                      <p className="xml-transformation-ai-candidate-warning">
                        Esta transformação foi gerada sem um mapper Sysmiddle cadastrado para
                        comparação — não há gabarito real por trás da convergência. Trate como ponto
                        de partida para revisão manual, não como transformação pronta para produção.
                      </p>
                    )}

                    <div
                      className="xml-transformation-delivery-actions"
                      role="group"
                      aria-label="Ações do XML sugerido por IA"
                    >
                      <button
                        type="button"
                        className="xml-transformation-copy-btn"
                        onClick={() => handleCopyAiXml(aiFallback.candidate?.transformedXml)}
                      >
                        Copiar XML
                      </button>
                      <button
                        type="button"
                        className="xml-transformation-download-btn"
                        onClick={() => handleDownloadAiXml(aiFallback.candidate?.transformedXml)}
                      >
                        Baixar XML
                      </button>
                    </div>

                    {deliveryFeedback && (
                      <p
                        className={`xml-transformation-delivery-feedback xml-transformation-delivery-feedback--${deliveryFeedback.kind}`}
                        role={deliveryFeedback.kind === 'error' ? 'alert' : 'status'}
                        aria-live="polite"
                      >
                        {deliveryFeedback.message}
                      </p>
                    )}

                    <XmlTree xml={aiFallback.candidate.transformedXml} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {candidates.length > 0 && (
        <>
          {candidates.length > 1 && (
            <div
              className="xml-transformation-candidate-selector"
              role="tablist"
              aria-label="Candidatos de transformação"
            >
              {candidates.map(candidate => {
                const pathwayLabel = PATHWAY_LABEL[candidate.pathway] || candidate.pathway;
                const differentiator = buildCandidateDifferentiator(
                  candidate.candidateId,
                  candidate.pathway
                );
                return (
                  <button
                    key={candidate.candidateId}
                    type="button"
                    role="tab"
                    aria-selected={candidate.candidateId === activeCandidate?.candidateId}
                    className={`xml-transformation-candidate-btn ${
                      candidate.candidateId === activeCandidate?.candidateId ? 'active' : ''
                    }`}
                    title={candidate.candidateId}
                    onClick={() => {
                      setActiveCandidateId(candidate.candidateId);
                      setDeliveryFeedback(null);
                    }}
                  >
                    {pathwayLabel}
                    {differentiator && (
                      <span className="xml-transformation-candidate-btn__id">
                        {' '}
                        — {differentiator}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {candidatesWarnings.length > 0 && (
            <div className="xml-transformation-warnings" role="status">
              {candidatesWarnings.map((warning, index) => (
                <p key={index}>⚠️ {warning}</p>
              ))}
            </div>
          )}

          {activeCandidate && (
            <div className="xml-transformation-result">
              <h3>
                XML Transformado (
                {PATHWAY_LABEL[activeCandidate.pathway] || activeCandidate.pathway})
              </h3>

              <div
                className="xml-transformation-delivery-actions"
                role="group"
                aria-label="Ações do XML transformado"
              >
                <button
                  type="button"
                  className="xml-transformation-copy-btn"
                  onClick={handleCopyXml}
                >
                  Copiar XML
                </button>
                <button
                  type="button"
                  className="xml-transformation-download-btn"
                  onClick={handleDownloadXml}
                >
                  Baixar XML
                </button>
              </div>

              {deliveryFeedback && (
                <p
                  className={`xml-transformation-delivery-feedback xml-transformation-delivery-feedback--${deliveryFeedback.kind}`}
                  role={deliveryFeedback.kind === 'error' ? 'alert' : 'status'}
                  aria-live="polite"
                >
                  {deliveryFeedback.message}
                </p>
              )}

              {activeCandidate.failureReason && (
                <div className="xml-transformation-error" role="alert">
                  ❌ {activeCandidate.failureReason}
                  <div className="xml-transformation-diagnose-action">
                    <button
                      type="button"
                      onClick={handleDiagnose}
                      disabled={isDiagnosing}
                      aria-busy={isDiagnosing}
                      className="xml-transformation-diagnose-btn"
                    >
                      {isDiagnosing ? 'Diagnosticando...' : 'Diagnosticar erro com IA'}
                    </button>
                  </div>
                </div>
              )}

              {isDiagnosing && (
                <div className="xml-transformation-diagnosing" role="status" aria-live="polite">
                  A IA (Ollama local) está analisando o erro. Isso pode levar de dezenas de segundos
                  a alguns minutos em ambientes sem GPU — aguarde, não é um travamento.
                </div>
              )}

              {diagnosticError && (
                <div className="xml-transformation-error" role="alert">
                  {diagnosticError.status === 400 && '❌ '}
                  {diagnosticError.status === 503 && '🔌 '}
                  {diagnosticError.status === 504 && '⏱️ '}
                  {diagnosticError.status === 500 && '⚠️ '}
                  {diagnosticError.message}
                </div>
              )}

              {diagnostic && (
                <div
                  className="xml-transformation-diagnostic"
                  role="region"
                  aria-label="Diagnóstico de IA"
                >
                  <h4>
                    Diagnóstico da IA{' '}
                    {diagnostic.confidence < 0.5 && (
                      <span className="xml-transformation-diagnostic-low-confidence">
                        (baixa certeza — {Math.round(diagnostic.confidence * 100)}%)
                      </span>
                    )}
                  </h4>
                  <p>{diagnostic.summary}</p>
                  {diagnostic.suggestedFix && (
                    <p className="xml-transformation-diagnostic-fix">
                      <strong>Sugestão:</strong> {diagnostic.suggestedFix}
                    </p>
                  )}
                </div>
              )}

              {/* Árvore navegável (expand/collapse) a partir do XML bruto — parseado via
                  `DOMParser` nativo, sem dependência nova. O valor copiado/baixado continua
                  sendo `activeCandidate.transformedXml`, não uma versão derivada da árvore. */}
              <XmlTree xml={activeCandidate.transformedXml} />
            </div>
          )}
        </>
      )}

      {!isLoadingCandidates &&
        !candidatesError &&
        !hasEvaluatedCandidates &&
        candidates.length === 0 && (
          <p className="xml-transformation-placeholder">
            Clique em &quot;Gerar Transformação XML&quot; para validar o documento e gerar a
            transformação final.
          </p>
        )}
    </div>
  );
};

export default XmlTransformationDisplay;
