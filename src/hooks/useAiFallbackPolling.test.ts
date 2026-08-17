import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { transformationService } from '../services/api/transformationService';
import type { AiCandidateStatus } from '../types/transformation';
import { useAiFallbackPolling } from './useAiFallbackPolling';

vi.mock('../services/api/transformationService', () => ({
  transformationService: {
    getAiCandidateStatus: vi.fn(),
  },
}));

const getAiCandidateStatus = vi.mocked(transformationService.getAiCandidateStatus);

describe('useAiFallbackPolling', () => {
  beforeEach(() => {
    getAiCandidateStatus.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não faz polling quando o ticket é null', () => {
    const { result } = renderHook(() => useAiFallbackPolling(null));

    expect(result.current).toEqual({
      status: null,
      candidate: null,
      diagnostics: null,
      error: null,
    });
    expect(getAiCandidateStatus).not.toHaveBeenCalled();
  });

  it('entra em running imediatamente e consulta o status após o primeiro atraso', async () => {
    getAiCandidateStatus.mockResolvedValue({
      status: 'running',
      candidate: null,
      diagnostics: null,
    });

    const { result } = renderHook(() => useAiFallbackPolling('ticket-1'));

    expect(result.current.status).toBe('running');
    expect(getAiCandidateStatus).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(getAiCandidateStatus).toHaveBeenCalledWith('ticket-1');
  });

  it('para de pollar ao atingir um estado terminal (converged)', async () => {
    const converged: AiCandidateStatus = {
      status: 'converged',
      candidate: {
        candidateId: 'ia-1',
        pathway: 'ia',
        transformedXml: '<root/>',
        score: null,
        segmentMappings: null,
        validation: null,
        failureReason: null,
      },
      diagnostics: {
        iterations: 3,
        remainingDiffs: 0,
        xsdValid: true,
        lastError: null,
        hasGroundTruth: false,
      },
    };
    getAiCandidateStatus.mockResolvedValue(converged);

    const { result } = renderHook(() => useAiFallbackPolling('ticket-2'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.status).toBe('converged');
    expect(result.current.candidate).toEqual(converged.candidate);
    expect(result.current.diagnostics?.hasGroundTruth).toBe(false);

    const callsAfterConverged = getAiCandidateStatus.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(getAiCandidateStatus).toHaveBeenCalledTimes(callsAfterConverged);
  });

  it('aplica backoff progressivo dobrando o atraso até o teto', async () => {
    getAiCandidateStatus.mockResolvedValue({
      status: 'running',
      candidate: null,
      diagnostics: null,
    });

    renderHook(() => useAiFallbackPolling('ticket-3'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });
    expect(getAiCandidateStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_000);
    });
    expect(getAiCandidateStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(32_000);
    });
    expect(getAiCandidateStatus).toHaveBeenCalledTimes(3);
  });

  it('reinicia o polling quando o ticket muda', async () => {
    getAiCandidateStatus.mockResolvedValue({
      status: 'running',
      candidate: null,
      diagnostics: null,
    });

    const { rerender } = renderHook(({ ticket }) => useAiFallbackPolling(ticket), {
      initialProps: { ticket: 'ticket-a' as string | null },
    });

    rerender({ ticket: 'ticket-b' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(getAiCandidateStatus).toHaveBeenCalledWith('ticket-b');
    expect(getAiCandidateStatus).not.toHaveBeenCalledWith('ticket-a');
  });

  it('registra erro de infraestrutura sem travar o polling', async () => {
    getAiCandidateStatus.mockRejectedValueOnce(new Error('Falha de rede'));
    getAiCandidateStatus.mockResolvedValueOnce({
      status: 'running',
      candidate: null,
      diagnostics: null,
    });

    const { result } = renderHook(() => useAiFallbackPolling('ticket-4'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });
    expect(result.current.error).toBe('Falha de rede');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_000);
    });
    expect(getAiCandidateStatus).toHaveBeenCalledTimes(2);
  });
});
