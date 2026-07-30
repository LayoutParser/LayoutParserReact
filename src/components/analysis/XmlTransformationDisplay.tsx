import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import { transformationService } from '../../services/api/transformationService';
import { logService } from '../../services/api/logService';
import {
  DiagnoseValidationErrorException,
  xmlAnalysisService,
} from '../../services/api/xmlAnalysisService';
import './XmlTransformationDisplay.css';

/**
 * Formata XML para leitura, sem lib externa: insere quebra de linha e indentação a partir
 * da estrutura de tags. É só um auxílio visual — não altera o XML retornado pela API, apenas
 * a apresentação em tela. Se o conteúdo tiver CDATA (não coberto pela lógica de indentação)
 * ou algo inesperado acontecer, devolve o texto original sem formatar: mostrar cru é melhor
 * do que corromper a leitura.
 */
const formatXmlForDisplay = (xml: string): string => {
  if (!xml || xml.includes('<![CDATA[')) {
    return xml;
  }

  try {
    const withLineBreaks = xml.replace(/>\s*</g, '><').replace(/></g, '>\n<');
    const indentUnit = '  ';
    let indentLevel = 0;

    return withLineBreaks
      .split('\n')
      .map(rawLine => {
        const line = rawLine.trim();
        if (!line) return '';

        const isClosingTag = /^<\/[^>]+>$/.test(line);
        const isSelfClosingOrDirective =
          /\/>$/.test(line) || /^<\?.*\?>$/.test(line) || /^<!--.*-->$/.test(line);
        const isOpenAndCloseSameLine = /^<([^\s/>]+)[^>]*>.*<\/\1>$/.test(line);

        if (isClosingTag && indentLevel > 0) {
          indentLevel -= 1;
        }

        const indented = indentUnit.repeat(indentLevel) + line;

        if (!isClosingTag && !isSelfClosingOrDirective && !isOpenAndCloseSameLine) {
          indentLevel += 1;
        }

        return indented;
      })
      .join('\n');
  } catch {
    return xml;
  }
};

const PATHWAY_LABEL: Record<string, string> = {
  sysmiddle: 'Sysmiddle',
  'tcl-xsl': 'TCL/XSL',
};

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
  const { selectedLayout, txtContent } = useAppStore();
  const {
    isLoadingCandidates,
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

  const formattedXml = useMemo(() => {
    if (activeCandidate) {
      return formatXmlForDisplay(activeCandidate.transformedXml);
    }
    return '';
  }, [activeCandidate]);

  const handleGenerate = async () => {
    if (!selectedLayout || !txtContent) {
      setCandidatesError('Documento processado ou layout selecionado não encontrado.');
      return;
    }

    setLoadingCandidates(true);
    setCandidatesError(null);
    setDiagnostic(null);
    setDiagnosticError(null);

    try {
      const result = await transformationService.executeTransformationCandidates({
        inputContent: txtContent,
        layoutName: selectedLayout.name,
        sourceDocumentType: null,
        targetDocumentType: null,
        validate: true,
        expectedOutput: null,
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
        candidates.length === 0 &&
        candidatesWarnings.length > 0 && (
          <div className="xml-transformation-empty" role="status">
            <p>Nenhum candidato de transformação foi gerado para este documento.</p>
            <ul>
              {candidatesWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
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
              {candidates.map(candidate => (
                <button
                  key={candidate.candidateId}
                  type="button"
                  role="tab"
                  aria-selected={candidate.candidateId === activeCandidate?.candidateId}
                  className={`xml-transformation-candidate-btn ${
                    candidate.candidateId === activeCandidate?.candidateId ? 'active' : ''
                  }`}
                  onClick={() => setActiveCandidateId(candidate.candidateId)}
                >
                  {PATHWAY_LABEL[candidate.pathway] || candidate.pathway}
                </button>
              ))}
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

              {/* tabIndex + role="region" permitem rolar o bloco via teclado (Tab + setas/Page
                  Down) — sem isso, quem não usa mouse não conseguia rolar um XML longo. */}
              <pre
                className="xml-transformation-content"
                tabIndex={0}
                role="region"
                aria-label="Conteúdo XML transformado"
              >
                {formattedXml}
              </pre>
            </div>
          )}
        </>
      )}

      {!isLoadingCandidates &&
        !candidatesError &&
        candidates.length === 0 &&
        candidatesWarnings.length === 0 && (
          <p className="xml-transformation-placeholder">
            Clique em &quot;Gerar Transformação XML&quot; para validar o documento e gerar a
            transformação final.
          </p>
        )}
    </div>
  );
};

export default XmlTransformationDisplay;
