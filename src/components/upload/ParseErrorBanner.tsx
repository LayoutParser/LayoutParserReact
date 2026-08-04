import React from 'react';
import type { ParseErrorInfo, ParseErrorKind } from '../../types/api';
import './ParseErrorBanner.css';

/**
 * Apresenta uma falha de parse já CLASSIFICADA (ver ParseRequestError em services/api.ts).
 *
 * O ponto deste componente é que os três casos NÃO são a mesma coisa e não podem ter a mesma
 * cara na tela:
 *  - 422  → diagnóstico do documento. A culpa não é da aplicação; a mensagem do back-end já
 *           explica a causa e é o texto principal.
 *  - 5xx  → falha do sistema. O usuário não tem o que corrigir; o que ajuda é o correlationId
 *           para ele reportar.
 *  - rede → conectividade. Ação útil é tentar de novo.
 */
interface ParseErrorBannerProps {
  error: ParseErrorInfo;
}

interface KindPresentation {
  icon: string;
  title: string;
  hint: string;
  modifier: string;
}

const PRESENTATION: Record<ParseErrorKind, KindPresentation> = {
  parse_error: {
    icon: '📄',
    title: 'Não foi possível interpretar este documento',
    hint: 'Verifique se o layout selecionado corresponde ao arquivo enviado.',
    modifier: 'parse-error-banner--document',
  },
  server_error: {
    icon: '⚠️',
    title: 'Falha no servidor ao processar o documento',
    hint: 'Tente novamente em instantes. Se persistir, reporte o código de rastreio abaixo.',
    modifier: 'parse-error-banner--server',
  },
  network_error: {
    icon: '🔌',
    title: 'Sem comunicação com a API',
    hint: 'Verifique sua conexão e se o serviço está no ar, depois tente novamente.',
    modifier: 'parse-error-banner--network',
  },
};

const ParseErrorBanner: React.FC<ParseErrorBannerProps> = ({ error }) => {
  const presentation = PRESENTATION[error.kind];

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

      {(error.detectedType || error.correlationId) && (
        <dl className="parse-error-banner-meta">
          {error.detectedType && (
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
