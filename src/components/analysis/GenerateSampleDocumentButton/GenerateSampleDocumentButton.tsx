import React, { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import {
  GenerateSampleDocumentError,
  sampleDocumentService,
} from '../../../services/api/sampleDocumentService';
import { resolveLayoutGuid } from '../../../utils/layoutGuid';
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
const GenerateSampleDocumentButton: React.FC = () => {
  const { selectedLayout, parseResult } = useAppStore();

  const [state, setState] = useState<RequestState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

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

  return (
    <div className="generate-sample-document">
      <Button
        variant="secondary"
        onClick={() => void handleGenerate()}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? 'Gerando...' : 'Gerar documento de exemplo'}
      </Button>

      {state === 'error' && errorMessage && (
        <div className="generate-sample-document-error" role="alert">
          ❌ {errorMessage}
        </div>
      )}

      {state === 'success' && generatedDocument && (
        <div className="generate-sample-document-result" role="status">
          {warnings.map(warning => (
            <p key={warning} className="generate-sample-document-warning">
              ⚠️ {warning}
            </p>
          ))}
          <pre className="generate-sample-document-content">{generatedDocument}</pre>
        </div>
      )}
    </div>
  );
};

export default GenerateSampleDocumentButton;
