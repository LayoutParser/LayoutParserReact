import { describe, expect, it } from 'vitest';
import { parseXmlToTree } from './xmlTree';

describe('parseXmlToTree', () => {
  it('retorna árvore vazia para string em branco, sem erro', () => {
    expect(parseXmlToTree('')).toEqual({ root: null, error: null });
    expect(parseXmlToTree('   ')).toEqual({ root: null, error: null });
  });

  it('reporta erro para XML malformado, sem lançar exceção', () => {
    const { root, error } = parseXmlToTree('<root><value>123</value>');

    expect(root).toBeNull();
    expect(error).not.toBeNull();
  });

  it('monta a árvore com elementos, atributos e texto de folha', () => {
    const xml = '<NFe><infNFe Id="NFe123"><ide><cUF>35</cUF></ide></infNFe></NFe>';
    const { root, error } = parseXmlToTree(xml);

    expect(error).toBeNull();
    expect(root?.name).toBe('NFe');
    expect(root?.id).toBe('/NFe[0]');

    const infNFe = root?.children[0];
    expect(infNFe?.name).toBe('infNFe');
    expect(infNFe?.attributes).toMatchObject([
      { id: '/NFe[0]/infNFe[0]/@Id', kind: 'attribute', name: 'Id', value: 'NFe123' },
    ]);

    const cUF = infNFe?.children[0]?.children[0];
    expect(cUF?.name).toBe('cUF');
    expect(cUF?.textContent).toBe('35');
    // Elemento com filhos-elemento não deve carregar texto próprio (evita capturar whitespace).
    expect(infNFe?.textContent).toBeNull();
  });

  it('desambigua ocorrências de irmãos com a mesma tag, por posição', () => {
    const xml = '<NFe><det>1</det><det>2</det><det>3</det></NFe>';
    const { root } = parseXmlToTree(xml);

    expect(root?.children.map(child => child.id)).toEqual([
      '/NFe[0]/det[0]',
      '/NFe[0]/det[1]',
      '/NFe[0]/det[2]',
    ]);
  });

  it('canonicaliza namespace default com o prefixo contratual e ocorrências 1-based', () => {
    const xml =
      '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><det><prod /></det><det><prod /></det></NFe>';
    const { root } = parseXmlToTree(xml, {
      nfe: 'http://www.portalfiscal.inf.br/nfe',
    });

    expect(root?.xpath).toBe('/nfe:NFe');
    expect(root?.children.map(child => [child.xpath, child.xpathOccurrence])).toEqual([
      ['/nfe:NFe/nfe:det', 1],
      ['/nfe:NFe/nfe:det', 2],
    ]);
  });
});
