import { describe, expect, it } from 'vitest';

import {
  assertEncodedReplacementSize,
  createDocumentFile,
  createEditedDocumentName,
  encodeDocumentContent,
  inspectDocumentSource,
} from './documentEncoding';

describe('documentEncoding', () => {
  it('preserva BOM, encoding UTF-8 e tamanho original', async () => {
    const originalBytes = Uint8Array.from([0xef, 0xbb, 0xbf, 0x41, 0x42]);
    const original = new File([originalBytes], 'entrada.txt', { type: 'text/plain' });
    const source = await inspectDocumentSource(original);

    expect(source).toMatchObject({
      name: 'entrada.txt',
      encoding: 'utf-8',
      hasBom: true,
      originalSize: 5,
    });

    const rebuilt = createDocumentFile('CD', source);
    expect(rebuilt.size).toBe(original.size);
    expect(Array.from(new Uint8Array(await rebuilt.arrayBuffer()))).toEqual([
      0xef, 0xbb, 0xbf, 0x43, 0x44,
    ]);
  });

  it('detecta Windows-1252 quando os bytes não formam UTF-8 válido', async () => {
    const original = new File([Uint8Array.from([0x43, 0x61, 0xe7, 0xe3, 0x6f])], 'latin1.txt');
    const source = await inspectDocumentSource(original);

    expect(source.encoding).toBe('windows-1252');
    expect(Array.from(encodeDocumentContent('Cação', source.encoding))).toEqual([
      0x43, 0x61, 0xe7, 0xe3, 0x6f,
    ]);
  });

  it('detecta UTF-16 sem BOM pela distribuição dos bytes nulos', async () => {
    const original = new File([Uint8Array.from([0x41, 0x00, 0x42, 0x00])], 'utf16.txt');

    await expect(inspectDocumentSource(original)).resolves.toMatchObject({
      encoding: 'utf-16le',
      hasBom: false,
      originalSize: 4,
    });
  });

  it('recusa troca com o mesmo número de caracteres e tamanho diferente no encoding', () => {
    expect(() => assertEncodedReplacementSize('AA', 'áA', 'utf-8')).toThrow(
      'mesmo tamanho no encoding original'
    );
  });

  it('não gera arquivo quando o tamanho posicional completo mudou', () => {
    expect(() =>
      createDocumentFile('ABC', {
        name: 'entrada.txt',
        mediaType: 'text/plain',
        lastModified: 0,
        encoding: 'utf-8',
        hasBom: false,
        originalSize: 2,
      })
    ).toThrow('original possui 2');
  });

  it('cria nome de download sem perder a extensão original', () => {
    expect(createEditedDocumentName('nota.mqseries')).toBe('nota-editado.mqseries');
    expect(createEditedDocumentName('documento')).toBe('documento-editado.txt');
  });
});
