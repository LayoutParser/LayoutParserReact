import apiClient from '../api';
import type { ClientLogEntry, ClientLogLevel } from '../../types/clientLog';

/**
 * Envia eventos de diagnóstico do front-end para a API (POST /api/logs/client), em vez de
 * `console.log` solto — decisão do usuário para termos visibilidade centralizada dos erros
 * que hoje só apareciam no console do navegador.
 *
 * TODO: contrato exato do endpoint (nome dos campos, se aceita batch) ainda não foi
 * confirmado com @lp-backend-dev — payload abaixo é o mínimo razoável. Ajustar quando
 * confirmado.
 *
 * Nunca deve derrubar o fluxo do usuário: falha ao logar é engolida silenciosamente (só um
 * fallback em `console.error`, para não perder o evento por completo em dev).
 */
const send = (level: ClientLogLevel, message: string, context?: Record<string, unknown>): void => {
  const entry: ClientLogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  apiClient.post('/api/logs/client', entry).catch(error => {
    if ((import.meta as any).env?.DEV) {
      console.error('[logService] Falha ao enviar log ao back-end:', error, entry);
    }
  });
};

export const logService = {
  info: (message: string, context?: Record<string, unknown>) => send('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => send('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => send('error', message, context),
};
