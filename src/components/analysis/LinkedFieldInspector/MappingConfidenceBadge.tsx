import React from 'react';

import type { FieldMappingConfidence } from '../../../types/transformation';

interface MappingConfidenceBadgeProps {
  confidence: FieldMappingConfidence;
}

const MappingConfidenceBadge: React.FC<MappingConfidenceBadgeProps> = ({ confidence }) => (
  <span
    className={`mapping-confidence mapping-confidence--${confidence === 'Authoritative' ? 'declared' : 'best-effort'}`}
  >
    {confidence === 'Authoritative' ? 'Declarado no mapeador' : 'Melhor estimativa'}
  </span>
);

export default MappingConfidenceBadge;
