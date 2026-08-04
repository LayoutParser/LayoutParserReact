import React from 'react';
import type { ParseErrorInfo } from '../../types/api';
import { assessParseFailure, type ParseFailureView } from '../../utils/parseFailure';
import './ParseErrorBanner.css';

/**
 * Apresenta uma falha de parse já CLASSIFICADA (ver ParseRequestError em services/api.ts).
 *
 * A classificação vem de `assessParseFailure`, que prioriza o `failureCause` declarado pelo
 * back-end e só cai no status HTTP enquanto o campo não for emitido. O ponto do componente é
 * que os casos NÃO são a mesma coisa e não podem ter a mesma cara na tela:
 *  - defeito nosso (`parser_defect`, 500) → o usuário não tem o que corrigir e NÃO se pede que
 *    ele investigue o próprio arquivo; o que ajuda é o correlationId para reportar.
 *  - defeito do arquivo (`document_malformed`/`layout_mismatch`, 422) → é diagnóstico do
 *    documento, e a ação corretiva é diferente em cada um (arquivo x layout escolhido).
 *  - rede → conectividade. Ação útil é tentar de novo.
 */
interface ParseErrorBannerProps {
  error: ParseErrorInfo;
}

interface ViewPresentation {
  icon: string;
  title: string;
  hint: string;
  modifier: string;
}

const PRESENTATION: Record<ParseFailureView, ViewPresentation> = {
  parser_defect: {
    icon: '⚠️',
    title: 'Falha interna ao processar o documento',
    hint: 'O problema é nosso, não do arquivo enviado. Reporte o código de rastreio abaixo para que possamos corrigir.',
    modifier: 'parse-error-banner--server',
  },
  document_malformed: {
    icon: '📄',
    title: 'O arquivo enviado não pôde ser lido',
    hint: 'O conteúdo está corrompido ou fora do formato esperado. Confira o arquivo e envie novamente.',
    modifier: 'parse-error-banner--document',
  },
  layout_mismatch: {
    icon: '🧩',
    title: 'O layout selecionado não corresponde ao arquivo',
    hint: 'Selecione o layout correspondente ao documento enviado e processe novamente.',
    modifier: 'parse-error-banner--document',
  },
  document_unclassified: {
    icon: '📄',
    title: 'Não foi possível interpretar este documento',
    hint: 'Verifique se o layout selecionado corresponde ao arquivo enviado.',
    modifier: 'parse-error-banner--document',
  },
  request_rejected: {
    icon: '⚠️',
    title: 'A API recusou a requisição',
    hint: 'Confira se o layout e o arquivo foram selecionados e tente novamente.',
    modifier: 'parse-error-banner--server',
  },
  unreachable: {
    icon: '🔌',
    title: 'Sem comunicação com a API',
    hint: 'Verifique sua conexão e se o serviço está no ar, depois tente novamente.',
    modifier: 'parse-error-banner--network',
  },
};

const ParseErrorBanner: React.FC<ParseErrorBannerProps> = ({ error }) => {
  const { view, blamesDocument } = assessParseFailure(error);
  const presentation = PRESENTATION[view];

  // `detectedType` é metadado SOBRE O ARQUIVO do usuário. Quando a falha é nossa, exibi-lo
  // convida exatamente o que a regra de produto quer evitar: o usuário sair investigando um
  // documento que provavelmente está bom.
  const showDetectedType = blamesDocument && Boolean(error.detectedType);

  return (
    <div className={`parse-error-banner ${presentation.modifier}`} role="alert">
      <div className="parse-error-banner-head">
        <span className="parse-error-banner-icon" aria-hidden="true">
          {presentation.icon}
        </span>
        <strong className="parse-error-banner-title">{presentation.title}</strong>
      </div>

      <p className="parse-error-banner-message">{error.message}</p>

      <p className="parse-error-banner-hint">{presentation.hint}</p>

      {(showDetectedType || error.correlationId) && (
        <dl className="parse-error-banner-meta">
          {showDetectedType && (
            <div className="parse-error-banner-meta-item">
              <dt>Tipo detectado</dt>
              <dd>{error.detectedType}</dd>
            </div>
          )}
          {error.correlationId && (
            <div className="parse-error-banner-meta-item">
              <dt>Código de rastreio</dt>
              <dd className="parse-error-banner-correlation">{error.correlationId}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
};

export default ParseErrorBanner;
