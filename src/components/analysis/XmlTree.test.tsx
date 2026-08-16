import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

    fireEvent.click(root);
    expect(root).toHaveAttribute('aria-expanded', 'true');
    const infNFe = within(tree).getByRole('treeitem', { name: /infNFe/ });
    expect(infNFe).toBeInTheDocument();

    fireEvent.click(root);
    expect(within(tree).queryByRole('treeitem', { name: /infNFe/ })).not.toBeInTheDocument();
  });

  it('diferencia visualmente atributos de elementos', () => {
    render(<XmlTree xml="<infNFe Id='NFe123'></infNFe>" />);

    const tree = screen.getByRole('tree', { name: 'Árvore do XML transformado' });
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
});
