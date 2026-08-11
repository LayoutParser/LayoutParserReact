import { describe, expect, it } from 'vitest';
import { buildTransformationDiagnostics } from './transformationDiagnostics';

describe('buildTransformationDiagnostics', () => {
  it('separa os motivos informados para Sysmiddle e TCL/XSL', () => {
    const diagnostics = buildTransformationDiagnostics([
      'Nenhum mapeador low-code encontrado para o layout Fiscal (pathway sysmiddle)',
      'Candidato tcl-xsl falhou: XSL não encontrado para o layout',
      'Nenhum candidato de transformação encontrado para o layout Fiscal',
    ]);

    expect(diagnostics.pathways).toEqual([
      {
        pathway: 'sysmiddle',
        label: 'Sysmiddle',
        reasons: ['Nenhum mapeador low-code encontrado para o layout Fiscal (pathway sysmiddle)'],
      },
      {
        pathway: 'tcl-xsl',
        label: 'TCL/XSL',
        reasons: ['Candidato tcl-xsl falhou: XSL não encontrado para o layout'],
      },
    ]);
    expect(diagnostics.generalWarnings).toEqual([]);
  });

  it('preserva warnings sem pathway como contexto geral', () => {
    const diagnostics = buildTransformationDiagnostics(['Catálogo temporariamente indisponível']);

    expect(diagnostics.pathways.every(pathway => pathway.reasons.length === 0)).toBe(true);
    expect(diagnostics.generalWarnings).toEqual(['Catálogo temporariamente indisponível']);
  });

  it('remove duplicatas e ignora apenas o resumo genérico de zero candidatos', () => {
    const diagnostics = buildTransformationDiagnostics([
      'Pathway sysmiddle falhou: runner indisponível',
      'Pathway sysmiddle falhou: runner indisponível',
      'Nenhum candidato de transformação encontrado para o layout Fiscal',
    ]);

    expect(diagnostics.pathways[0].reasons).toEqual([
      'Pathway sysmiddle falhou: runner indisponível',
    ]);
    expect(diagnostics.generalWarnings).toEqual([]);
  });
});
