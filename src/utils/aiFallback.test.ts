import { describe, expect, it } from 'vitest';
import { extractAiFallbackTicket } from './aiFallback';

describe('extractAiFallbackTicket', () => {
  it('extrai o ticket quando o fallback de IA foi enfileirado', () => {
    const warnings = [
      'Nenhum candidato de transformação encontrado — fallback automático de IA enfileirado ' +
        '(ticket abc-123), consulte GET execute-candidates/{ticket}/ia-status',
    ];

    expect(extractAiFallbackTicket(warnings)).toBe('abc-123');
  });

  it('retorna null quando o cooldown está ativo (sem novo ticket)', () => {
    const warnings = [
      'Pathway IA fallback suprimido para este layout até 14:32 (já tentado sem sucesso)',
    ];

    expect(extractAiFallbackTicket(warnings)).toBeNull();
  });

  it('retorna null quando o pathway sysmiddle falhou sem gerar fallback', () => {
    const warnings = ['Candidato LAY_abc (pathway sysmiddle) falhou: erro de infraestrutura'];

    expect(extractAiFallbackTicket(warnings)).toBeNull();
  });

  it('retorna null para lista vazia', () => {
    expect(extractAiFallbackTicket([])).toBeNull();
  });

  it('encontra o ticket mesmo quando não é o primeiro warning da lista', () => {
    const warnings = [
      'Aviso irrelevante',
      'Nenhum candidato de transformação encontrado — fallback automático de IA enfileirado ' +
        '(ticket XYZ-999), consulte GET execute-candidates/{ticket}/ia-status',
    ];

    expect(extractAiFallbackTicket(warnings)).toBe('XYZ-999');
  });

  it('tolera espaços extras dentro do ticket capturado', () => {
    const warnings = [
      'Nenhum candidato de transformação encontrado — fallback automático de IA enfileirado ' +
        '(ticket  ticket-com-espaco ), consulte GET execute-candidates/{ticket}/ia-status',
    ];

    expect(extractAiFallbackTicket(warnings)).toBe('ticket-com-espaco');
  });
});
