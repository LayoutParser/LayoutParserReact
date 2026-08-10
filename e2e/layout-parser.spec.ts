import { expect, test, type Page } from '@playwright/test';

const layoutGuid = '11111111-1111-1111-1111-111111111111';

const mockAuthenticatedGateway = async (page: Page, isAdmin = true) => {
  await page.route('**/api/session', route =>
    route.fulfill({
      json: {
        authenticated: true,
        user: { name: 'FACULDADE\\aluno' },
        roles: isAdmin ? ['admin'] : ['user'],
        isAdmin,
      },
    })
  );
};

const mockProcessingApis = async (page: Page) => {
  await page.route('**/api/layoutdatabase/mqseries-nfe', route =>
    route.fulfill({
      json: {
        success: true,
        layouts: [
          {
            layoutGuid,
            name: 'Layout Demonstração',
            description: 'Fixture sintética para E2E',
            decryptedContent: '<layout />',
          },
        ],
      },
    })
  );

  await page.route('**/api/parse/upload', route =>
    route.fulfill({
      headers: { 'X-Correlation-ID': 'e2e-correlation' },
      json: {
        success: true,
        detectedType: 'mqseries',
        text: '001ABC',
        layout: {
          layoutGuid,
          layoutType: '2',
          name: 'Layout Demonstração',
          description: 'Fixture sintética',
          limitOfCaracters: 6,
          elements: [],
        },
        fields: [
          {
            lineName: 'LINHA001',
            fieldName: 'Código',
            value: 'ABC',
            startPosition: 4,
            length: 3,
            lineSequence: '001',
            sequence: 1,
            isValid: true,
          },
        ],
        transformationsStatus: 'completed',
      },
    })
  );

  await page.route('**/api/mapperdatabase/by-input/*', route =>
    route.fulfill({
      json: {
        success: true,
        id: 1,
        mapperGuid: 'mapper-1',
        name: 'Mapper E2E',
        description: 'Fixture sintética',
        inputLayoutGuid: layoutGuid,
        targetLayoutGuid: 'target-1',
        hasDecryptedContent: true,
        lastUpdateDate: '2026-08-10T00:00:00Z',
      },
    })
  );

  await page.route('**/api/transformationexecution/execute-candidates', route =>
    route.fulfill({
      json: {
        success: true,
        candidates: [
          {
            candidateId: 'sysmiddle-mapper-1',
            pathway: 'sysmiddle',
            transformedXml: '<documento><codigo>ABC</codigo></documento>',
            score: null,
            segmentMappings: {},
            validation: null,
            failureReason: null,
          },
        ],
        recommendedCandidateId: 'sysmiddle-mapper-1',
        warnings: [],
      },
    })
  );
};

test('processa TXT e entrega o XML transformado para download', async ({ page }) => {
  await mockAuthenticatedGateway(page);
  await mockProcessingApis(page);
  await page.goto('/upload');

  await page.getByRole('button', { name: 'Buscar Layout' }).click();
  await page.getByRole('combobox', { name: 'Selecionar Layout' }).click();
  await page.getByRole('option', { name: /Layout Demonstração/ }).click();
  await page.locator('#txtFile').setInputFiles({
    name: 'documento.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('001ABC'),
  });
  await page.getByRole('button', { name: 'Processar Documento' }).click();

  await expect(page.getByRole('tab', { name: 'XML Transformação Final' })).toBeVisible();
  await page.getByRole('tab', { name: 'XML Transformação Final' }).click();
  await page.getByRole('button', { name: 'Gerar Transformação XML' }).click();

  const xml = page.getByRole('textbox', { name: 'Conteúdo XML transformado' });
  await expect(xml).toHaveValue(/<documento>/);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar XML' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.xml$/);
});

test('não renderiza o painel administrativo sem a função admin', async ({ page }) => {
  await mockAuthenticatedGateway(page, false);
  await page.goto('/admin');

  await expect(page.getByRole('alert')).toContainText('Acesso restrito');
  await expect(page.getByText('Painel Administrativo')).toHaveCount(0);
});
