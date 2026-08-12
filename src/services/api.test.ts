import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { parseService, ParseRequestError } from './api';
import { SESSION_EXPIRED_EVENT } from '../types/session';

const server = setupServer();

const createRequest = () => ({
  layoutFile: new File(['<layout />'], 'layout.xml', { type: 'application/xml' }),
  txtFile: new File(['001CONTEUDO'], 'documento.txt', { type: 'text/plain' }),
  layoutName: 'Layout seguro',
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('parseService', () => {
  it('envia multipart e correlation id na mesma origem', async () => {
    server.use(
      http.post('*/api/parse/upload', ({ request }) => {
        expect(request.headers.get('x-correlation-id')).toBeTruthy();
        expect(request.headers.get('content-type')).toContain('multipart/form-data');

        return HttpResponse.json({
          success: true,
          detectedType: 'mqseries',
          text: '001CONTEUDO',
          fields: [],
        });
      })
    );

    await expect(parseService.parseFiles(createRequest())).resolves.toMatchObject({
      success: true,
      detectedType: 'mqseries',
    });
  });

  it('preserva a taxonomia e o correlation id de um 422', async () => {
    server.use(
      http.post('*/api/parse/upload', () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Documento incompatível com o layout.',
            detectedType: 'idoc',
            failureCause: 'document_malformed',
          },
          { status: 422, headers: { 'X-Correlation-ID': 'corr-422' } }
        )
      )
    );

    const error = await parseService.parseFiles(createRequest()).catch(reason => reason);

    expect(error).toBeInstanceOf(ParseRequestError);
    expect(error).toMatchObject({
      kind: 'parse_error',
      httpStatus: 422,
      detectedType: 'idoc',
      correlationId: 'corr-422',
      failureCause: 'document_malformed',
    });
  });

  it('classifica uma falha 500 como erro de servidor', async () => {
    server.use(
      http.post('*/api/parse/upload', () =>
        HttpResponse.json(
          { message: 'Falha controlada.', failureCause: 'parser_defect' },
          { status: 500 }
        )
      )
    );

    const error = await parseService.parseFiles(createRequest()).catch(reason => reason);

    expect(error).toMatchObject({
      kind: 'server_error',
      httpStatus: 500,
      failureCause: 'parser_defect',
      message: 'O servidor encontrou uma falha ao processar o documento.',
    });
    expect(error.message).not.toContain('Falha controlada');
  });

  it('classifica indisponibilidade de rede sem inventar status HTTP', async () => {
    server.use(http.post('*/api/parse/upload', () => HttpResponse.error()));

    const error = await parseService.parseFiles(createRequest()).catch(reason => reason);

    expect(error).toMatchObject({
      kind: 'network_error',
      httpStatus: undefined,
    });
  });

  it('notifica a aplicação quando a sessão expira durante uma chamada protegida', async () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    server.use(http.post('*/api/parse/upload', () => HttpResponse.json({}, { status: 401 })));

    await parseService.parseFiles(createRequest()).catch(() => undefined);

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });
});
