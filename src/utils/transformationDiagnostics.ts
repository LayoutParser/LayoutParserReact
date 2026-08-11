export type TransformationPathway = 'sysmiddle' | 'tcl-xsl';

export interface TransformationPathwayDiagnostic {
  pathway: TransformationPathway;
  label: string;
  reasons: string[];
}

export interface TransformationDiagnostics {
  pathways: TransformationPathwayDiagnostic[];
  generalWarnings: string[];
}

const GENERIC_NO_CANDIDATE_PATTERN = /nenhum candidato de transformacao (foi )?encontrado/;

const PATHWAY_PATTERNS: Record<TransformationPathway, RegExp> = {
  sysmiddle: /\b(sysmiddle|low-code|lowcode|mapper|mapeador)\b/,
  'tcl-xsl': /\b(tcl[\s/-]?xsl|xslt?|pipeline)\b/,
};

const normalizeForMatch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const uniqueWarnings = (warnings: string[]): string[] =>
  Array.from(new Set(warnings.map(warning => warning.trim()).filter(Boolean)));

/**
 * Organiza os warnings textuais do contrato atual sem inventar causas. O back-end ainda não
 * devolve diagnóstico estruturado por pathway; por isso preservamos o texto original e apenas
 * o associamos a Sysmiddle ou TCL/XSL quando a própria mensagem identifica o caminho.
 */
export const buildTransformationDiagnostics = (warnings: string[]): TransformationDiagnostics => {
  const normalizedWarnings = uniqueWarnings(warnings);
  const reasonsByPathway: Record<TransformationPathway, string[]> = {
    sysmiddle: [],
    'tcl-xsl': [],
  };
  const generalWarnings: string[] = [];

  normalizedWarnings.forEach(warning => {
    const normalized = normalizeForMatch(warning);

    if (GENERIC_NO_CANDIDATE_PATTERN.test(normalized)) {
      return;
    }

    const matchedPathways = (Object.keys(PATHWAY_PATTERNS) as TransformationPathway[]).filter(
      pathway => PATHWAY_PATTERNS[pathway].test(normalized)
    );

    if (matchedPathways.length === 0) {
      generalWarnings.push(warning);
      return;
    }

    matchedPathways.forEach(pathway => reasonsByPathway[pathway].push(warning));
  });

  return {
    pathways: [
      { pathway: 'sysmiddle', label: 'Sysmiddle', reasons: reasonsByPathway.sysmiddle },
      { pathway: 'tcl-xsl', label: 'TCL/XSL', reasons: reasonsByPathway['tcl-xsl'] },
    ],
    generalWarnings,
  };
};
