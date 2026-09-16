import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  LayoutTreeNode,
  LayoutTreeRuleLink,
  LayoutTreeSide,
  MappingRuleExplanation,
} from '../../types/workspace';
import MappingLayoutTreeView from './MappingLayoutTreeView';

const leafSource: LayoutTreeNode = {
  guid: 'src-leaf-1',
  name: 'CampoOrigem',
  kind: 'attribute',
  cardinality: { min: 0, max: 1 },
  children: [],
};

const rootSource1: LayoutTreeNode = {
  guid: 'src-root-1',
  name: 'RaizOrigemA',
  kind: 'element',
  cardinality: { min: 1, max: 1 },
  children: [leafSource],
};

const rootSource2: LayoutTreeNode = {
  guid: 'src-root-2',
  name: 'RaizOrigemB',
  kind: 'group',
  cardinality: { min: null, max: null },
  children: [],
};

const leafTarget: LayoutTreeNode = {
  guid: 'tgt-leaf-1',
  name: 'CampoDestino',
  kind: 'attribute',
  cardinality: { min: 1, max: null },
  children: [],
};

const rootTarget: LayoutTreeNode = {
  guid: 'tgt-root-1',
  name: 'RaizDestino',
  kind: 'element',
  cardinality: { min: 1, max: 1 },
  children: [leafTarget],
};

const source: LayoutTreeSide = { roots: [rootSource1, rootSource2] };
const target: LayoutTreeSide = { roots: [rootTarget] };

const rules: LayoutTreeRuleLink[] = [
  { ruleId: 'RULE-1', sourceElementGuid: 'src-leaf-1', targetElementGuid: 'tgt-leaf-1' },
];

const explanationRule = (ruleId: string): MappingRuleExplanation => ({
  ruleId,
  sourceRefs: ['SRC'],
  targetRefs: ['TGT'],
  condition: null,
  operations: ['copy'],
  cardinality: '1:1',
  evidence: [],
  humanDescription: 'Copia origem para destino.',
  technicalDetail: null,
  supportLevel: 'authoritative',
});

describe('MappingLayoutTreeView', () => {
  it('renderiza múltiplas raízes de origem e a raiz de destino', () => {
    render(
      <MappingLayoutTreeView
        source={source}
        target={target}
        rules={rules}
        explanationRules={[explanationRule('RULE-1')]}
      />
    );

    expect(screen.getByText('RaizOrigemA')).toBeVisible();
    expect(screen.getByText('RaizOrigemB')).toBeVisible();
    expect(screen.getByText('RaizDestino')).toBeVisible();
  });

  it('mostra cardinalidade formatada, incluindo nulos como opcional/ilimitado', () => {
    render(
      <MappingLayoutTreeView source={source} target={target} rules={rules} explanationRules={[]} />
    );

    const cardinalities = Array.from(
      document.querySelectorAll('.mapping-layout-tree-cardinality')
    ).map(node => node.textContent);
    expect(cardinalities).toContain('(1..1)');
    expect(cardinalities).toContain('(opcional)');
  });

  it('exibe o badge de regra inline no nó de origem vinculado', () => {
    render(
      <MappingLayoutTreeView
        source={source}
        target={target}
        rules={rules}
        explanationRules={[explanationRule('RULE-1')]}
      />
    );

    expect(screen.getAllByText('Regra RULE-1').length).toBeGreaterThan(0);
  });

  it('contabiliza regras da explicação sem correspondência na árvore', () => {
    render(
      <MappingLayoutTreeView
        source={source}
        target={target}
        rules={rules}
        explanationRules={[explanationRule('RULE-1'), explanationRule('RULE-DSL-2')]}
      />
    );

    expect(
      screen.getByText(/1 regra\(s\) da explicação não representável na árvore ainda/)
    ).toBeVisible();
  });

  it('não mostra o contador quando todas as regras da explicação estão na árvore', () => {
    render(
      <MappingLayoutTreeView
        source={source}
        target={target}
        rules={rules}
        explanationRules={[explanationRule('RULE-1')]}
      />
    );

    expect(screen.queryByText(/não representável/)).not.toBeInTheDocument();
  });

  it('destaca o nó correspondente do outro lado ao selecionar um nó com regra', () => {
    render(
      <MappingLayoutTreeView
        source={source}
        target={target}
        rules={rules}
        explanationRules={[explanationRule('RULE-1')]}
      />
    );

    fireEvent.click(screen.getByText('CampoOrigem'));
    const targetItem = screen.getByText('CampoDestino').closest('[role="treeitem"]');
    expect(targetItem).toHaveClass('mapping-layout-tree-item--highlighted');
  });

  it('mostra o painel de propriedades do nó selecionado', () => {
    render(
      <MappingLayoutTreeView source={source} target={target} rules={rules} explanationRules={[]} />
    );

    fireEvent.click(screen.getByText('RaizOrigemA'));
    const panel = screen.getByText('Propriedades do nó selecionado').closest('section');
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByText('RaizOrigemA')).toBeVisible();
    expect(within(panel as HTMLElement).getByText('Elemento')).toBeVisible();
  });

  it('filtra nós por nome em ambas as árvores via busca', () => {
    render(
      <MappingLayoutTreeView source={source} target={target} rules={rules} explanationRules={[]} />
    );

    fireEvent.change(screen.getByLabelText('Buscar nó nas árvores de origem e destino'), {
      target: { value: 'CampoOrigem' },
    });

    expect(screen.getByText('CampoOrigem')).toBeVisible();
    expect(screen.queryByText('RaizOrigemB')).not.toBeInTheDocument();
    expect(screen.queryByText('RaizDestino')).not.toBeInTheDocument();
    expect(screen.queryByText('CampoDestino')).not.toBeInTheDocument();
  });

  it('expande e recolhe tudo via toolbar', () => {
    render(
      <MappingLayoutTreeView source={source} target={target} rules={rules} explanationRules={[]} />
    );

    expect(screen.queryByText('CampoOrigem')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Recolher tudo' }));
    expect(screen.queryByText('CampoOrigem')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir tudo' }));
    expect(screen.getByText('CampoOrigem')).toBeVisible();
  });

  it('mostra estado vazio quando um lado não tem raízes', () => {
    render(
      <MappingLayoutTreeView
        source={source}
        target={{ roots: [] }}
        rules={[]}
        explanationRules={[]}
      />
    );

    expect(screen.getByText('Nenhum nó de destino disponível.')).toBeVisible();
  });
});
