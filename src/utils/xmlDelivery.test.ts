import { describe, expect, it } from 'vitest';
import { createXmlFileName, formatXmlForDisplay } from './xmlDelivery';

describe('xmlDelivery', () => {
  it('indenta o XML somente para apresentação', () => {
    const rawXml = '<root><item>valor</item><empty /></root>';

    expect(formatXmlForDisplay(rawXml)).toBe(
      ['<root>', '  <item>valor</item>', '  <empty />', '</root>'].join('\n')
    );
    expect(rawXml).toBe('<root><item>valor</item><empty /></root>');
  });

  it('preserva XML com CDATA para não alterar seu conteúdo visualmente', () => {
    const rawXml = '<root><![CDATA[<item>sem parse</item>]]></root>';
    expect(formatXmlForDisplay(rawXml)).toBe(rawXml);
  });

  it('mantém a indentação depois de um comentário XML multilinha', () => {
    const rawXml = '<root><!-- primeira linha\nsegunda linha --><item>valor</item></root>';

    expect(formatXmlForDisplay(rawXml)).toBe(
      [
        '<root>',
        '  <!-- primeira linha',
        '  segunda linha -->',
        '  <item>valor</item>',
        '</root>',
      ].join('\n')
    );
  });

  it('preserva entrada vazia', () => {
    expect(formatXmlForDisplay('')).toBe('');
  });

  it('gera nome de arquivo seguro a partir do layout e candidato', () => {
    expect(createXmlFileName(' Layout / NFe ', 'tcl xsl:1')).toBe('Layout-NFe-tcl-xsl-1.xml');
  });

  it('usa fallback quando os identificadores não têm caracteres seguros', () => {
    expect(createXmlFileName('***', '///')).toBe('transformacao-transformacao.xml');
  });
});
