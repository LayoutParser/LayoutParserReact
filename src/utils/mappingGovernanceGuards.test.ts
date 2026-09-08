import { describe, expect, it } from 'vitest';
import type { MappingReleaseStatus } from '../types/mappingRelease';
import { isMappingGovernanceActionAllowed } from './mappingGovernanceGuards';

const allStatuses: MappingReleaseStatus[] = [
  'draft_compiled',
  'test_passed',
  'test_failed',
  'in_review',
  'approved',
  'published',
  'deprecated',
  'archived',
];

describe('isMappingGovernanceActionAllowed', () => {
  it('permite approve apenas quando a release está test_passed', () => {
    for (const status of allStatuses) {
      expect(isMappingGovernanceActionAllowed(status, 'approve')).toBe(status === 'test_passed');
    }
  });

  it('permite publish apenas quando a release está approved', () => {
    for (const status of allStatuses) {
      expect(isMappingGovernanceActionAllowed(status, 'publish')).toBe(status === 'approved');
    }
  });

  it('permite rollback apenas quando a release está published (única mutação de uma release imutável)', () => {
    for (const status of allStatuses) {
      expect(isMappingGovernanceActionAllowed(status, 'rollback')).toBe(status === 'published');
    }
  });

  it('bloqueia qualquer ação de edição/autoria contra uma release publicada, exceto rollback', () => {
    expect(isMappingGovernanceActionAllowed('published', 'approve')).toBe(false);
    expect(isMappingGovernanceActionAllowed('published', 'publish')).toBe(false);
    expect(isMappingGovernanceActionAllowed('published', 'rollback')).toBe(true);
  });
});
