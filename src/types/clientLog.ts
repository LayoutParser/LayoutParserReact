// Tipos para o log de front-end enviado à API (POST /api/logs/client).
//
// Decisão do usuário: front-end NUNCA usa console.log/console.error solto para eventos que
// importam para diagnóstico — deve enviar via este endpoint. Endpoint ainda não confirmado
// em detalhe com @lp-backend-dev (Dex); shape abaixo é o mínimo razoável (nível + mensagem +
// contexto sanitizado). Conteúdo de documento/layout/XML nunca deve entrar neste contrato.

export type ClientLogLevel = 'info' | 'warn' | 'error';

export interface ClientLogEntry {
  level: ClientLogLevel;
  message: string;
  // Contexto sanitizado (ex.: layoutGuid, correlationId, status) — serializável em JSON.
  context?: Record<string, unknown>;
  // ISO 8601, gerado no front no momento do evento.
  timestamp: string;
}
