import { useEffect, useRef, useState } from 'react';
import { transformationService } from '../services/api/transformationService';
import type {
  AiCandidate,
  AiCandidateDiagnostics,
  AiCandidateStatusValue,
} from '../types/transformation';

// Polling do fallback automático de IA (issue #140). O job na API tem teto técnico de 45min e
// o ticket fica consultável por 72h após concluir — pollar a cada 1s seria abusivo. Backoff
// progressivo: começa em INITIAL_DELAY_MS, dobra a cada tentativa até MAX_DELAY_MS, e para nos
// estados terminais (`converged`, `failed`, `not-applicable`, `not-found`).
const INITIAL_DELAY_MS = 8_000;
const MAX_DELAY_MS = 60_000;

export interface UseAiFallbackPollingResult {
  status: AiCandidateStatusValue | null;
  candidate: AiCandidate | null;
  diagnostics: AiCandidateDiagnostics | null;
  error: string | null;
}

const IDLE_RESULT: UseAiFallbackPollingResult = {
  status: null,
  candidate: null,
  diagnostics: null,
  error: null,
};

const RUNNING_RESULT: UseAiFallbackPollingResult = {
  status: 'running',
  candidate: null,
  diagnostics: null,
  error: null,
};

const TERMINAL_STATUSES: AiCandidateStatusValue[] = [
  'converged',
  'failed',
  'not-applicable',
  'not-found',
];

/**
 * Faz o polling de `GET .../{ticket}/ia-status` com backoff progressivo enquanto `ticket` não
 * for `null`. Reinicia automaticamente quando `ticket` muda; para quando desmonta ou atinge um
 * estado terminal. `error` só é preenchido em falha de infraestrutura (rede/5xx) — 404 vira
 * `status: 'not-found'` na própria camada de serviço, não um erro aqui.
 *
 * O reset de estado ao trocar de `ticket` acontece durante a renderização (padrão oficial do
 * React para "ajustar estado quando uma prop muda"), não dentro do `useEffect` — evita disparar
 * `react-hooks/set-state-in-effect` por chamar `setState` sincronamente no corpo do efeito.
 */
export function useAiFallbackPolling(ticket: string | null): UseAiFallbackPollingResult {
  const [result, setResult] = useState<UseAiFallbackPollingResult>(() =>
    ticket ? RUNNING_RESULT : IDLE_RESULT
  );
  const [trackedTicket, setTrackedTicket] = useState<string | null>(ticket);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (ticket !== trackedTicket) {
    setTrackedTicket(ticket);
    setResult(ticket ? RUNNING_RESULT : IDLE_RESULT);
  }

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!ticket) {
      return;
    }

    let cancelled = false;
    let delay = INITIAL_DELAY_MS;

    const poll = async () => {
      try {
        const response = await transformationService.getAiCandidateStatus(ticket);
        if (cancelled) {
          return;
        }

        setResult({
          status: response.status,
          candidate: response.candidate,
          diagnostics: response.diagnostics,
          error: null,
        });

        if (TERMINAL_STATUSES.includes(response.status)) {
          return;
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Erro desconhecido ao consultar status da IA';
        setResult(previous => ({ ...previous, error: message }));
        // Falha de infraestrutura não interrompe o polling — o job continua rodando no
        // back-end; tenta de novo no próximo ciclo de backoff.
      }

      if (cancelled) {
        return;
      }

      timeoutRef.current = setTimeout(poll, delay);
      delay = Math.min(delay * 2, MAX_DELAY_MS);
    };

    timeoutRef.current = setTimeout(poll, delay);
    delay = Math.min(delay * 2, MAX_DELAY_MS);

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [ticket]);

  return result;
}
