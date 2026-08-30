import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test, type Response } from '@playwright/test';

const EXPECTED = {
  documentBytes: 35_400,
  layoutName: 'LAY_TXT_MQSERIES_ENVNFE_4.00_NFe',
  rawFields: 705,
  physicalLines: 59,
  line81Occurrences: 4,
} as const;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/;

interface FixtureFile {
  path: string;
}

interface ParseMetadata {
  success?: boolean;
  detectedType?: string;
  text?: string;
  fields?: unknown[];
  layout?: { name?: string };
  summary?: {
    totalLines?: number;
    totalFields?: number;
    errorFields?: number;
  };
}

interface AutomaticParsePayload {
  success?: boolean;
  correlationId?: string;
  detection?: {
    status?: 'unique' | 'ambiguous' | 'not_found';
    totalCandidates?: number;
    selectedLayout?: { layoutGuid?: string; name?: string };
    candidates?: Array<{
      rank?: number;
      layoutGuid?: string;
      name?: string;
      matchScore?: number;
    }>;
  };
  parseResult?: ParseMetadata;
}

interface TransformationResult {
  success?: boolean;
  candidates?: unknown[];
  warnings?: unknown[];
  pathwayDiagnostics?: unknown[];
}

const privateFixtureCandidates = (): string[] => {
  const configured = process.env.REAL_E2E_FIXTURE_DIR?.trim();
  const programData = process.env.ProgramData?.trim() || 'C:\\ProgramData';
  return [
    ...(configured ? [resolve(configured)] : []),
    resolve('.codex/temp/teste'),
    resolve(programData, 'LayoutParser/e2e-fixtures/mqseries'),
  ];
};

const findPrivateDocument = async (): Promise<FixtureFile> => {
  for (const directory of privateFixtureCandidates()) {
    try {
      const entries = await readdir(directory, { withFileTypes: true });
      const documents = entries.filter(
        entry => entry.isFile() && entry.name.toLocaleLowerCase('en-US').endsWith('.txt')
      );
      if (documents.length !== 1) continue;

      const path = join(directory, documents[0]!.name);
      const metadata = await stat(path);
      if (metadata.size !== EXPECTED.documentBytes) continue;

      return { path };
    } catch {
      // A próxima localização privada pode estar provisionada no runner.
    }
  }

  throw new Error(
    'Fixture privada não encontrada. Defina REAL_E2E_FIXTURE_DIR ou provisione C:\\ProgramData\\LayoutParser\\e2e-fixtures\\mqseries.'
  );
};

const responsePathIs =
  (path: string) =>
  (response: Response): boolean => {
    try {
      return new URL(response.url()).pathname.toLocaleLowerCase('en-US') === path;
    } catch {
      return false;
    }
  };

const assertCorrelationRoundTrip = async (response: Response, label: string): Promise<string> => {
  const requestId = await response.request().headerValue('x-correlation-id');
  const responseId = await response.headerValue('x-correlation-id');

  expect(
    {
      label,
      status: response.status(),
      requestIdValid: Boolean(requestId && CORRELATION_ID_PATTERN.test(requestId)),
      responseIdValid: Boolean(responseId && CORRELATION_ID_PATTERN.test(responseId)),
      preservedEndToEnd: requestId === responseId,
    },
    `${label}: o correlation ID deve atravessar navegador → BFF → API → navegador sem mudar`
  ).toEqual({
    label,
    status: 200,
    requestIdValid: true,
    responseIdValid: true,
    preservedEndToEnd: true,
  });

  return requestId!;
};

const readAutomaticPayload = async (response: Response): Promise<AutomaticParsePayload> =>
  (await response.json()) as AutomaticParsePayload;

const expectCorrectParse = (payload: ParseMetadata): void => {
  expect({
    success: payload.success,
    detectedType: payload.detectedType,
    layoutName: payload.layout?.name,
    textLength: payload.text?.length,
    fields: payload.fields?.length,
    totalLines: payload.summary?.totalLines,
    totalFields: payload.summary?.totalFields,
    errorFields: payload.summary?.errorFields,
  }).toEqual({
    success: true,
    detectedType: 'mqseries',
    layoutName: EXPECTED.layoutName,
    textLength: EXPECTED.documentBytes,
    fields: EXPECTED.rawFields,
    totalLines: EXPECTED.physicalLines,
    totalFields: EXPECTED.rawFields,
    errorFields: 0,
  });
};

test('usuário processa e edita o MQSeries real com correlação ponta a ponta', async ({ page }) => {
  const document = await findPrivateDocument();
  const layoutName = process.env.REAL_E2E_LAYOUT_NAME?.trim() || EXPECTED.layoutName;
  const correlationIds: string[] = [];

  const sessionResponsePromise = page.waitForResponse(responsePathIs('/api/session'));
  await page.goto('/upload');
  const sessionResponse = await sessionResponsePromise;
  correlationIds.push(await assertCorrelationRoundTrip(sessionResponse, 'sessão'));
  const session = (await sessionResponse.json()) as {
    authenticated?: boolean;
    user?: { name?: string };
  };
  expect({ authenticated: session.authenticated, identified: Boolean(session.user?.name) }).toEqual(
    {
      authenticated: true,
      identified: true,
    }
  );

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Selecionar arquivo' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(document.path);
  await expect(page.locator('#txtFile-status')).toContainText('Arquivo selecionado');

  const detectionResponsePromise = page.waitForResponse(responsePathIs('/api/parse/auto'));
  await page.getByRole('button', { name: 'Processar Documento' }).click();
  const detectionResponse = await detectionResponsePromise;
  correlationIds.push(
    await assertCorrelationRoundTrip(detectionResponse, 'detecção automática de layout')
  );
  const detection = await readAutomaticPayload(detectionResponse);
  const candidates = detection.detection?.candidates ?? [];
  expect({
    success: detection.success,
    status: detection.detection?.status,
    selectedLayout: detection.detection?.selectedLayout,
    parseResult: detection.parseResult,
    candidateCount: candidates.length,
    expectedCandidateFound: candidates.some(candidate => candidate.name === layoutName),
  }).toMatchObject({
    success: true,
    status: 'ambiguous',
    selectedLayout: undefined,
    parseResult: undefined,
    expectedCandidateFound: true,
  });
  expect(candidates.length).toBeGreaterThanOrEqual(2);
  expect(candidates.length).toBeLessThanOrEqual(5);
  await expect(page.getByText('Escolha entre os layouts equivalentes')).toBeVisible();

  const expectedCandidateCard = page
    .locator('.layout-candidate-card')
    .filter({ hasText: layoutName });
  await expect(expectedCandidateCard).toHaveCount(1);
  const parseResponsePromise = page.waitForResponse(responsePathIs('/api/parse/auto'));
  await expectedCandidateCard.getByRole('button', { name: 'Usar este layout' }).click();
  const parseResponse = await parseResponsePromise;
  correlationIds.push(
    await assertCorrelationRoundTrip(parseResponse, 'parse após escolha explícita')
  );
  const parsed = await readAutomaticPayload(parseResponse);
  expect(parsed.detection?.selectedLayout?.name).toBe(layoutName);
  expectCorrectParse(parsed.parseResult ?? {});

  const provenance = page.locator('.document-provenance');
  await expect(provenance).toContainText('Resultado vinculado a');
  await expect(provenance).toContainText(`${EXPECTED.documentBytes} bytes`);
  await expect(provenance).toContainText(layoutName);

  await page.getByRole('tab', { name: 'XML Transformação Final' }).click();
  const transformationResponsePromise = page.waitForResponse(
    responsePathIs('/api/transformationexecution/execute-candidates')
  );
  await page.getByRole('button', { name: 'Gerar Transformação XML' }).click();
  const transformationResponse = await transformationResponsePromise;
  correlationIds.push(
    await assertCorrelationRoundTrip(transformationResponse, 'transformação multi-candidato')
  );
  const transformation = (await transformationResponse.json()) as TransformationResult;
  expect({
    success: transformation.success,
    candidatesIsArray: Array.isArray(transformation.candidates),
    warningsIsArray: Array.isArray(transformation.warnings),
    diagnosticsIsArray: Array.isArray(transformation.pathwayDiagnostics),
  }).toEqual({
    success: true,
    candidatesIsArray: true,
    warningsIsArray: true,
    diagnosticsIsArray: true,
  });
  await page.getByRole('tab', { name: 'TXT Posicional' }).click();

  const line81Labels = page.getByText(/^LINHA081 - Ocorrência [1-4]$/, { exact: true });
  await expect(line81Labels).toHaveCount(EXPECTED.line81Occurrences);

  await page
    .getByPlaceholder('Buscar campos (nome, valor ou GUID)...')
    .fill('NroProtocoloAutorizacao');
  const protocolField = page
    .getByRole('button', {
      name: /Selecionar campo NroProtocoloAutorizacao, ocorrência 1: vazio/,
    })
    .first();
  await protocolField.click();

  const inspector = page.getByRole('complementary', { name: 'Inspetor de rastreabilidade' });
  await expect(inspector).toContainText('LINHA000 · ocorrência 1');
  await expect(inspector).toContainText('Posições 75–89 · 15 caracteres');
  await inspector.getByRole('button', { name: 'Editar valor' }).click();

  const editor = page.getByRole('dialog', { name: 'Editar NroProtocoloAutorizacao' });
  await expect(editor).toContainText('Linha física 2');
  await expect(editor).toContainText('Posições 75–89');
  await expect(editor).toContainText('15 posições');
  await editor.getByLabel('Novo valor').fill('N'.repeat(15));
  await editor.getByRole('button', { name: 'Aplicar no TXT' }).click();

  const editActions = page.getByRole('region', { name: 'Ações do TXT editado' });
  await expect(editActions).toContainText('1 alteração(ões) nesta sessão');

  const reparseResponsePromise = page.waitForResponse(responsePathIs('/api/parse/auto'));
  await editActions.getByRole('button', { name: 'Reprocessar e revalidar' }).click();
  const reparseResponse = await reparseResponsePromise;
  correlationIds.push(await assertCorrelationRoundTrip(reparseResponse, 'reparse após edição'));
  expectCorrectParse((await readAutomaticPayload(reparseResponse)).parseResult ?? {});
  await expect(editActions.getByRole('status')).toContainText(
    'Documento reprocessado e revalidado sem erros posicionais'
  );

  expect({ total: correlationIds.length, unique: new Set(correlationIds).size }).toEqual({
    total: 5,
    unique: 5,
  });
});
