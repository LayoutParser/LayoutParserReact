// Tipos para o log de front-end enviado à API (POST /api/logs/client).
//
// Decisão do usuário: front-end NUNCA usa console.log/console.error solto para eventos que
// importam para diagnóstico — deve enviar via este endpoint. Endpoint ainda não confirmado
// em detalhe com @lp-backend-dev (Dex); shape abaixo é o mínimo razoável (nível + mensagem +
// contexto livre) e pode precisar de ajuste quando o contrato exato for validado.

export type ClientLogLevel = 'info' | 'warn' | 'error';

export interface ClientLogEntry {
  level: ClientLogLevel;
  message: string;
  // Contexto livre (ex.: layoutGuid, correlationId, stack) — serializável em JSON.
  context?: Record<string, unknown>;
  // ISO 8601, gerado no front no momento do evento.
  timestamp: string;
}
