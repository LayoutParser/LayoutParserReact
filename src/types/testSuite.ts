/**
 * Test Lab por suíte versionada (LayoutParserApi#423, `Controllers/TestSuiteController.cs`).
 * Complementa o fluxo de fixture única existente em `MappingTestRunJob`
 * (`types/mappingRelease.ts`): aqui uma suíte agrupa várias fixtures fiscais e a execução em
 * lote (`run`) é SÍNCRONA — a API devolve o resultado completo no 200, sem polling de job.
 */

export interface TestSuite {
  suiteId: string;
  workspaceId: string;
  draftId: string;
  name: string;
  description: string | null;
  createdByUserId: string;
  createdAt: string;
  eTag: string;
}

export interface TestFixture {
  fixtureId: string;
  suiteId: string;
  name: string;
  inputXml: string;
  expectedXml: string;
  xsdVersion: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CreateTestSuiteInput {
  workspaceId: string;
  draftId: string;
  name: string;
  description?: string | null;
}

export interface CreateTestFixtureInput {
  workspaceId: string;
  draftId: string;
  suiteId: string;
  name: string;
  inputXml: string;
  expectedXml: string;
  xsdVersion?: string | null;
}

/**
 * Resultado por fixture dentro de uma execução de suíte. O shape interno de `fixtureResults`
 * não foi inspecionado pelo `@lp-contract-qa` (só a assinatura do endpoint foi confirmada no
 * código-fonte). Modelamos aqui o mínimo comum já usado no restante do domínio (fixture,
 * aprovação e duração) e tratamos qualquer campo além destes como desconhecido — não inventamos
 * shape de divergências específico até confirmação real da API.
 */
export interface TestSuiteFixtureResult {
  fixtureId: string;
  fixtureName: string;
  passed: boolean;
  durationMs: number | null;
  /** Detalhe cru devolvido pela API para este resultado — não tipado além do mínimo acima. */
  raw: unknown;
}

export interface TestSuiteRun {
  runId: string;
  suiteId: string;
  releaseId: string;
  executedByUserId: string;
  executedAt: string;
  totalFixtures: number;
  passed: number;
  failed: number;
  requiredGatesPassed: boolean;
  durationMs: number | null;
  fixtureResults: TestSuiteFixtureResult[];
}

export interface TestSuiteRunListResponse {
  items: TestSuiteRun[];
  totalCount: number;
}
