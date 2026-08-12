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

const mockProcessingApis = async (page: Page, withoutCandidates = false) => {
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
        transformationsStatus: withoutCandidates ? 'processing' : 'completed',
        transformationsReason: withoutCandidates ? 'timeout_sync' : undefined,
      },
    })
  );

  await page.route('**/api/transformationexecution/execute-candidates', route =>
    route.fulfill({
      json: {
        success: true,
        candidates: withoutCandidates
          ? []
          : [
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
        recommendedCandidateId: withoutCandidates ? null : 'sysmiddle-mapper-1',
        warnings: withoutCandidates
          ? [
              'Nenhum mapeador low-code encontrado para o layout Layout Demonstração (pathway sysmiddle)',
              'Candidato tcl-xsl falhou: XSL não encontrado para o layout',
              'Nenhum candidato de transformação encontrado para o layout Layout Demonstração',
            ]
          : [],
      },
    })
  );
};

const processSyntheticDocument = async (page: Page) => {
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
};

test('processa TXT e entrega o XML transformado para download', async ({ page }) => {
  await mockAuthenticatedGateway(page);
  await mockProcessingApis(page);
  await processSyntheticDocument(page);

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

test('explica a ausência de candidatos Sysmiddle e TCL/XSL sem mensagem de background', async ({
  page,
}) => {
  await mockAuthenticatedGateway(page);
  await mockProcessingApis(page, true);
  await processSyntheticDocument(page);

  await expect(page.getByText(/continua sendo processada em segundo plano/i)).toHaveCount(0);
  await page.getByRole('tab', { name: 'XML Transformação Final' }).click();
  await page.getByRole('button', { name: 'Gerar Transformação XML' }).click();

  const diagnostic = page.getByRole('region', { name: 'Nenhum candidato foi encontrado' });
  await expect(diagnostic).toBeVisible();
  await expect(diagnostic.getByRole('region', { name: 'Diagnóstico Sysmiddle' })).toContainText(
    'Nenhum mapeador low-code encontrado'
  );
  await expect(diagnostic.getByRole('region', { name: 'Diagnóstico TCL/XSL' })).toContainText(
    'Candidato tcl-xsl falhou: XSL não encontrado'
  );
});

test('não renderiza o painel administrativo sem a função admin', async ({ page }) => {
  await mockAuthenticatedGateway(page, false);
  await page.goto('/admin');

  await expect(page.getByRole('alert')).toContainText('Acesso restrito');
  await expect(page.getByText('Painel Administrativo')).toHaveCount(0);
});

test('bloqueia o conteúdo anônimo e oferece entrada Microsoft', async ({ page }) => {
  await page.route('**/api/session', route =>
    route.fulfill({
      json: {
        authenticated: false,
        user: { name: '' },
        roles: [],
        isAdmin: false,
      },
    })
  );

  await page.goto('/upload');

  const login = page.getByRole('link', { name: 'Entrar com Microsoft' });
  await expect(login).toBeVisible();
  await expect(login).toHaveAttribute('href', '/auth/login?returnTo=%2Fupload');
  await expect(page.getByRole('button', { name: 'Processar Documento' })).toHaveCount(0);
});
