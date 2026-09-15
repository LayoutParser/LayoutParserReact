import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import XmlTree from './XmlTree';

describe('XmlTree', () => {
  it('mostra mensagem neutra quando não há XML', () => {
    render(<XmlTree xml="" />);
    expect(screen.getByText('Nenhum XML para exibir.')).toBeInTheDocument();
  });

  it('reporta XML malformado sem quebrar a tela', () => {
    render(<XmlTree xml="<root><value>123</value>" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('começa colapsada e expande/recolhe ao clicar no nó', () => {
    render(<XmlTree xml="<NFe><infNFe Id='NFe123'><ide><cUF>35</cUF></ide></infNFe></NFe>" />);

    const tree = screen.getByRole('tree', { name: 'Árvore do XML transformado' });
    const root = within(tree).getByRole('treeitem', { name: /<NFe>/ });
    expect(root).toHaveAttribute('aria-expanded', 'false');
    expect(within(tree).queryByRole('treeitem', { name: /infNFe/ })).not.toBeInTheDocument();

    fireEvent.click(root.querySelector('.xml-tree-toggle')!);
    expect(root).toHaveAttribute('aria-expanded', 'true');
    const infNFe = within(tree).getByRole('treeitem', { name: /infNFe/ });
    expect(infNFe).toBeInTheDocument();

    fireEvent.click(root.querySelector('.xml-tree-toggle')!);
    expect(within(tree).queryByRole('treeitem', { name: /infNFe/ })).not.toBeInTheDocument();
  });

  it('diferencia visualmente atributos de elementos', () => {
    render(<XmlTree xml="<infNFe Id='NFe123'></infNFe>" />);

    const tree = screen.getByRole('tree', { name: 'Árvore do XML transformado' });
    fireEvent.click(
      within(tree)
        .getByRole('treeitem', { name: /infNFe/ })
        .querySelector('.xml-tree-toggle')!
    );
    const attribute = within(tree).getByTestId('xml-tree-attribute');
    expect(attribute).toHaveTextContent('@Id');
    expect(attribute.querySelector('.xml-tree-attribute-name')).toHaveTextContent('@Id');
    expect(attribute.querySelector('.xml-tree-attribute-value')).toHaveTextContent('"NFe123"');
  });

  it('expandir tudo / recolher tudo alternam todos os níveis da árvore', () => {
    render(
      <XmlTree xml="<NFe><det><prod><cProd>1</cProd></prod></det><det><prod><cProd>2</cProd></prod></det></NFe>" />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expandir tudo' }));
    expect(screen.getAllByText('1')).toHaveLength(1);
    expect(screen.getAllByText('2')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Recolher tudo' }));
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  // Story #234 — gatilho de reporte de divergência por nó.
  it('só mostra o gatilho de divergência em nós folha, quando habilitado', () => {
    render(
      <XmlTree
        xml="<NFe><ide><cUF>35</cUF></ide></NFe>"
        canReportDivergence
        onReportDivergence={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expandir tudo' }));

    const tree = screen.getByRole('tree', { name: 'Árvore do XML transformado' });
    // <NFe> e <ide> têm descendentes: não são folha, não ganham o gatilho (na própria linha,
    // sem contar os descendentes aninhados na mesma <li>).
    expect(
      within(tree).getByRole('treeitem', { name: /<NFe>/ }).closest('.xml-tree-node-row')
    ).not.toHaveTextContent('Reportar divergência');
    // <cUF> tem um #text como filho — o próprio #text é a folha real (sem descendentes).
    expect(
      within(tree).getByRole('treeitem', { name: /<cUF>/ }).closest('.xml-tree-node-row')
    ).not.toHaveTextContent('Reportar divergência');
    const leafRow = within(tree)
      .getByRole('treeitem', { name: /#text/ })
      .closest('.xml-tree-node-row');
    expect(within(leafRow as HTMLElement).getByText('Reportar divergência')).toBeInTheDocument();
  });

  it('não mostra o gatilho de divergência quando desabilitado (sem candidato ativo)', () => {
    render(<XmlTree xml="<NFe><cUF>35</cUF></NFe>" />);
    fireEvent.click(screen.getByRole('button', { name: 'Expandir tudo' }));
    expect(screen.queryByText('Reportar divergência')).not.toBeInTheDocument();
  });

  it('dispara onReportDivergence com o nó folha clicado e mostra indicador quando reportado', () => {
    const handleReport = vi.fn();
    render(
      <XmlTree
        xml="<NFe><cUF>35</cUF></NFe>"
        canReportDivergence
        onReportDivergence={handleReport}
        isNodeReported={node => node.kind === 'text'}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expandir tudo' }));
    fireEvent.click(screen.getByText('Editar divergência'));
    expect(handleReport).toHaveBeenCalledTimes(1);
    expect(handleReport.mock.calls[0][0]).toMatchObject({ kind: 'text', value: '35' });

    const tree = screen.getByRole('tree', { name: 'Árvore do XML transformado' });
    expect(within(tree).getByRole('treeitem', { name: /#text/ })).toHaveClass(
      'xml-tree-node-header--reported'
    );
  });
});
