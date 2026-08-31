import { Readable } from 'node:stream';
import { text } from 'node:stream/consumers';

import { describe, expect, it } from 'vitest';

import { MultipartPayloadError, PayloadLimitError, PayloadLimitTransform } from '../src/limits.js';

async function encodeFormData(entries: readonly [string, Blob, string][]): Promise<{
  body: Buffer;
  contentType: string;
}> {
  const form = new FormData();
  for (const [field, value, filename] of entries) {
    form.append(field, value, filename);
  }

  const request = new Request('http://bff.local/upload', { method: 'POST', body: form });
  return {
    body: Buffer.from(await request.arrayBuffer()),
    contentType: request.headers.get('content-type') ?? '',
  };
}

async function passThrough(
  body: Buffer,
  contentType: string,
  requestLimit: number,
  documentLimit: number,
  documentFieldAliases: readonly string[] = []
) {
  const transform = new PayloadLimitTransform({
    contentType,
    requestLimitBytes: requestLimit,
    documentLimitBytes: documentLimit,
    documentField: 'txtFile',
    documentFieldAliases,
  });
  return text(Readable.from(body).pipe(transform));
}

describe('PayloadLimitTransform', () => {
  it('preserva payloads abaixo do limite', async () => {
    await expect(passThrough(Buffer.from('payload'), 'text/plain', 16, 8)).resolves.toBe('payload');
  });

  it('rejeita a requisição completa acima do limite', async () => {
    await expect(
      passThrough(Buffer.alloc(17), 'application/octet-stream', 16, 8)
    ).rejects.toMatchObject({
      name: 'PayloadLimitError',
      limitKind: 'request',
    });
  });

  it('rejeita especificamente o documento txtFile acima do limite', async () => {
    const multipart = await encodeFormData([
      ['txtFile', new Blob([Buffer.alloc(9)]), 'document.txt'],
    ]);

    await expect(passThrough(multipart.body, multipart.contentType, 2048, 8)).rejects.toMatchObject(
      {
        name: 'PayloadLimitError',
        limitKind: 'document',
      }
    );
  });

  it('aplica o mesmo limite ao alias documentFile da detecção automática', async () => {
    const multipart = await encodeFormData([
      ['documentFile', new Blob([Buffer.alloc(9)]), 'document.txt'],
    ]);

    await expect(
      passThrough(multipart.body, multipart.contentType, 2048, 8, ['documentFile'])
    ).rejects.toMatchObject({
      name: 'PayloadLimitError',
      limitKind: 'document',
    });
  });

  it('não aplica o limite de documento ao layout XML, mantendo o limite total', async () => {
    const multipart = await encodeFormData([
      ['layoutFile', new Blob([Buffer.alloc(9)]), 'layout.xml'],
      ['txtFile', new Blob([Buffer.alloc(8)]), 'document.txt'],
    ]);

    await expect(passThrough(multipart.body, multipart.contentType, 4096, 8)).resolves.toHaveLength(
      multipart.body.length
    );
  });

  it('rejeita multipart sem boundary', () => {
    expect(
      () =>
        new PayloadLimitTransform({
          contentType: 'multipart/form-data',
          requestLimitBytes: 1024,
          documentLimitBytes: 512,
          documentField: 'txtFile',
        })
    ).toThrowError(MultipartPayloadError);
  });

  it('expõe erros de limite com status 413', () => {
    expect(new PayloadLimitError('request').statusCode).toBe(413);
  });
});
