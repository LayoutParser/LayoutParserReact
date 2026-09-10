import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import {
  GenerateSampleDocumentError,
  sampleDocumentService,
} from '../../../services/api/sampleDocumentService';
import { resolveLayoutGuid } from '../../../utils/layoutGuid';
import { copyTextToClipboard, createXmlFileName } from '../../../utils/xmlDelivery';
import Button from '../../shared/Button';
import './GenerateSampleDocumentButton.css';

type RequestState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Botão "Gerar documento de exemplo" (issues #238–#241).
 *
 * Contrato de referência: POST /api/layouts/{layoutGuid}/generate-sample
 * (LayoutParserApi#355/#356) — ainda NÃO em produção. `sampleDocumentService` implementa o
 * mesmo formato de resposta por trás de um mock; ver aquele arquivo para o ponto de troca.
 *
 * Condições de exibição/habilitação (#238):
 * - Layout do tipo Xml: a API de geração para esse formato (#356) nem começou — mostramos um
 *   aviso fixo em vez do botão (#240), sem chamar o serviço.
 * - Layout TextPositional: NÃO existe hoje, em nenhum lugar do contrato (`Layout`,
 *   `ParsedLayout`, `ParseResponse`, catálogo de releases), um campo real que diga "este
 *   layout tem mapper TCL/XSL/XSLT vinculado". `transformationsReason === 'no_mapper'`
 *   existe, mas é documentado (ver `AnalysisModeTabs.tsx`) como exclusivo do pathway
 *   Sysmiddle — usá-lo aqui seria inventar um significado que o campo não tem. Também não
 *   acoplamos à avaliação de `execute-candidates` (aba "XML Transformação Final"): isso
 *   esconderia o botão sem nenhum motivo visível para quem não passou por aquela aba antes,
 *   uma UX enganosa. Sem sinal real de catálogo, o botão fica SEMPRE visível para layouts não
 *   XML e é a própria chamada ao endpoint quem decide: um 404 (`no_mapper`) vira a mensagem
 *   amigável tratada abaixo (issue #239) — essa resposta é a fonte da verdade.
 */
interface DeliveryFeedback {
  kind: 'success' | 'error';
  message: string;
}

const GenerateSampleDocumentButton: React.FC = () => {
  const { selectedLayout, parseResult } = useAppStore();

  const [state, setState] = useState<RequestState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [deliveryFeedback, setDeliveryFeedback] = useState<DeliveryFeedback | null>(null);

  // Foco automático (a11y): ao concluir ou falhar, o resultado/erro recebe foco de teclado —
  // sem isso, quem navega via teclado ou leitor de tela não percebe que o estado mudou.
  const errorRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === 'error') {
      errorRef.current?.focus();
    } else if (state === 'success') {
      resultRef.current?.focus();
    }
  }, [state]);

  if (!selectedLayout || !parseResult?.success) {
    return null;
  }

  const isXmlLayout = selectedLayout.layoutType === 'Xml';

  if (isXmlLayout) {
    return (
      <div className="generate-sample-document generate-sample-document--unavailable" role="status">
        Geração de documento de exemplo ainda não está disponível para layouts do tipo XML.
      </div>
    );
  }

  const handleGenerate = async () => {
    const layoutGuid = resolveLayoutGuid(parseResult.layout?.layoutGuid, selectedLayout.layoutGuid);

    setState('loading');
    setErrorMessage(null);
    setGeneratedDocument(null);
    setWarnings([]);
    setDeliveryFeedback(null);

    try {
      const response = await sampleDocumentService.generateSampleDocument(layoutGuid ?? '');
      setGeneratedDocument(response.generatedDocument);
      setWarnings(response.warnings);
      setState('success');
    } catch (error) {
      const message =
        error instanceof GenerateSampleDocumentError
          ? error.message
          : 'Não foi possível gerar o documento de exemplo. Tente novamente.';
      setErrorMessage(message);
      setState('error');
    }
  };

  const handleCopy = async () => {
    if (!generatedDocument) return;

    try {
      await copyTextToClipboard(generatedDocument);
      setDeliveryFeedback({
        kind: 'success',
        message: 'Documento copiado para a área de transferência.',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível copiar o documento.';
      setDeliveryFeedback({ kind: 'error', message });
    }
  };

  const handleDownload = () => {
    if (!generatedDocument) return;

    try {
      const blob = new Blob([generatedDocument], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = createXmlFileName(
        selectedLayout.name ?? 'documento-exemplo',
        'amostra'
      ).replace(/\.xml$/, '.txt');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDeliveryFeedback({ kind: 'success', message: 'Download do documento iniciado.' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível baixar o documento.';
      setDeliveryFeedback({ kind: 'error', message });
    }
  };

  return (
    <div className="generate-sample-document">
      <div className="generate-sample-document-actions">
        <Button
          variant="secondary"
          onClick={() => void handleGenerate()}
          disabled={state === 'loading'}
        >
          {state === 'loading' ? 'Gerando...' : 'Gerar documento de exemplo'}
        </Button>
        {state === 'loading' && (
          <span className="generate-sample-document-spinner" aria-hidden="true" />
        )}
      </div>

      {state === 'idle' && (
        <p className="generate-sample-document-hint">
          Gera um documento TXT de amostra a partir deste layout, usando dados fictícios.
        </p>
      )}

      {state === 'error' && errorMessage && (
        <div className="generate-sample-document-error" role="alert" tabIndex={-1} ref={errorRef}>
          ❌ {errorMessage}
        </div>
      )}

      {state === 'success' && generatedDocument && (
        <div
          className="generate-sample-document-result"
          role="status"
          tabIndex={-1}
          ref={resultRef}
        >
          {warnings.map(warning => (
            <p key={warning} className="generate-sample-document-warning">
              ⚠️ {warning}
            </p>
          ))}

          <div
            className="generate-sample-document-delivery-actions"
            role="group"
            aria-label="Ações do documento gerado"
          >
            <button
              type="button"
              className="generate-sample-document-copy-btn"
              onClick={() => void handleCopy()}
            >
              Copiar documento
            </button>
            <button
              type="button"
              className="generate-sample-document-download-btn"
              onClick={handleDownload}
            >
              Baixar documento
            </button>
          </div>

          {deliveryFeedback && (
            <p
              className={`generate-sample-document-delivery-feedback generate-sample-document-delivery-feedback--${deliveryFeedback.kind}`}
              role={deliveryFeedback.kind === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {deliveryFeedback.message}
            </p>
          )}

          <pre className="generate-sample-document-content">{generatedDocument}</pre>
        </div>
      )}
    </div>
  );
};

export default GenerateSampleDocumentButton;
