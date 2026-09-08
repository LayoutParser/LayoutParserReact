import type { MappingReleaseStatus } from '../types/mappingRelease';

export type MappingGovernanceAction = 'approve' | 'publish' | 'rollback';

/**
 * Único ponto de verdade sobre qual transição de governança é permitida a partir do status atual
 * de uma release (issue #225 — imutabilidade de release publicada). A UI já só desenha o botão da
 * transição válida para o status corrente, mas esta função é a guarda defensiva chamada antes de
 * qualquer mutação: se o estado local estiver desatualizado (ex.: race condition) ou a ação vier de
 * um caminho que não passou pela renderização condicional, a chamada de escrita é rejeitada aqui,
 * sem round-trip à API. Uma release `published` só aceita `rollback` — nenhuma edição/autoria.
 */
const allowedTransition: Partial<Record<MappingReleaseStatus, MappingGovernanceAction>> = {
  test_passed: 'approve',
  approved: 'publish',
  published: 'rollback',
};

export function isMappingGovernanceActionAllowed(
  status: MappingReleaseStatus,
  action: MappingGovernanceAction
): boolean {
  return allowedTransition[status] === action;
}
