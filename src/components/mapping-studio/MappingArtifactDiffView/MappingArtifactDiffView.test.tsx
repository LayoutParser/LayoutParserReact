import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MappingReleaseArtifact } from '../../../types/mappingRelease';
import MappingArtifactDiffView from './MappingArtifactDiffView';

const artifact = (overrides: Partial<MappingReleaseArtifact> = {}): MappingReleaseArtifact => ({
  kind: 'xslt',
  content: 'line-a\nline-b',
  hash: 'hash-1',
  generatedAt: '2026-08-31T12:00:00Z',
  ...overrides,
});

describe('MappingArtifactDiffView', () => {
  it('mostra estado vazio quando não há baseline para comparar', () => {
    render(
      <MappingArtifactDiffView
        baseline={null}
        current={artifact()}
        baselineLabel="Release anterior"
        currentLabel="Release atual"
      />
    );

    expect(screen.getByText('Nenhum artefato de referência')).toBeVisible();
  });

  it('mostra estado de carregamento', () => {
    render(
      <MappingArtifactDiffView
        baseline={null}
        current={artifact()}
        baselineLabel="Release anterior"
        currentLabel="Release atual"
        loading
      />
    );

    expect(screen.getByText('Carregando artefato para comparação…')).toBeVisible();
  });

  it('mostra erro amigável quando a busca da baseline falha', () => {
    render(
      <MappingArtifactDiffView
        baseline={null}
        current={artifact()}
        baselineLabel="Release anterior"
        currentLabel="Release atual"
        error="Não foi possível carregar a release anterior."
      />
    );

    expect(screen.getByText('Não foi possível carregar a release anterior.')).toBeVisible();
  });

  it('indica quando os dois artefatos são idênticos', () => {
    render(
      <MappingArtifactDiffView
        baseline={artifact()}
        current={artifact()}
        baselineLabel="Release anterior"
        currentLabel="Release atual"
      />
    );

    expect(
      screen.getByText('Nenhuma diferença de conteúdo entre os dois artefatos.')
    ).toBeVisible();
  });

  it('renderiza linhas adicionadas e removidas quando o conteúdo muda', () => {
    render(
      <MappingArtifactDiffView
        baseline={artifact({ content: 'linha-antiga', hash: 'hash-old' })}
        current={artifact({ content: 'linha-nova', hash: 'hash-new' })}
        baselineLabel="Release anterior"
        currentLabel="Release atual"
      />
    );

    expect(screen.getByText('linha-antiga')).toBeVisible();
    expect(screen.getByText('linha-nova')).toBeVisible();
  });

  it('recusa comparar artefatos de tipos diferentes', () => {
    render(
      <MappingArtifactDiffView
        baseline={artifact({ kind: 'tcl' })}
        current={artifact({ kind: 'xslt' })}
        baselineLabel="Release anterior"
        currentLabel="Release atual"
      />
    );

    expect(screen.getByText(/tipos diferentes/i)).toBeVisible();
  });
});
