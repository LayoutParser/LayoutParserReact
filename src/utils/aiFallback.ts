// Extração do sinal de fallback automático de IA a partir de `warnings[]` de
// `TransformationCandidatesResponse` (issue #140). Não há campo estruturado dedicado no
// contrato — o back-end sinaliza via texto livre em `warnings`, então a detecção precisa ser
// resiliente a pequenas mudanças de redação (não usar `split` ingênuo).
//
// Textos literais possíveis quando `candidates` vem vazio:
// 1. Fallback enfileirado: "... fallback automático de IA enfileirado (ticket {ticket}), ..."
// 2. Cooldown ativo (sem novo ticket): "Pathway IA fallback suprimido para este layout até ..."
// 3. Falha de infraestrutura do pathway sysmiddle (sem fallback): "Candidato {mapperGuid} ..."
//
// Só o caso 1 produz um ticket pollável; os outros dois retornam `null` propositalmente.

const FALLBACK_ENQUEUED_PREFIX = 'Nenhum candidato de transformação encontrado';
const TICKET_PATTERN = /ticket\s+([^)]+)\)/i;

/**
 * Procura em `warnings[]` uma mensagem de fallback de IA enfileirado e extrai o ticket.
 * Retorna `null` quando nenhuma mensagem de fallback enfileirado está presente (inclui os
 * casos de cooldown suprimido e falha de pathway, que não geram ticket pollável).
 */
export const extractAiFallbackTicket = (warnings: string[]): string | null => {
  for (const warning of warnings) {
    if (!warning.startsWith(FALLBACK_ENQUEUED_PREFIX)) {
      continue;
    }

    const match = warning.match(TICKET_PATTERN);
    if (match) {
      const ticket = match[1].trim();
      if (ticket) {
        return ticket;
      }
    }
  }

  return null;
};
