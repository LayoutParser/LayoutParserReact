import axios from 'axios';
import type {
  CreateTestFixtureInput,
  CreateTestSuiteInput,
  TestFixture,
  TestSuite,
  TestSuiteFixtureResult,
  TestSuiteRun,
  TestSuiteRunListResponse,
} from '../../types/testSuite';
import apiClient from '../api';

/**
 * Test Lab por suíte versionada (LayoutParserApi#423,
 * `Controllers/TestSuiteController.cs`). Rota base:
 * `api/workspaces/{workspaceId}/mapping-drafts/{draftId}/test-suites`. A execução em lote
 * (`POST {suiteId}/run`) é SÍNCRONA — sem job/polling, ao contrário do test-run de fixture
 * única em `mappingReleaseService`.
 */

export type TestSuiteRequestErrorKind =
  | 'invalid_input'
  | 'invalid_response'
  | 'unauthorized'
  | 'not_found'
  | 'rejected'
  | 'unavailable'
  | 'request_failed';

export class TestSuiteRequestError extends Error {
  readonly kind: TestSuiteRequestErrorKind;

  constructor(kind: TestSuiteRequestErrorKind, message: string) {
    super(message);
    this.name = 'TestSuiteRequestError';
    this.kind = kind;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isValidDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function resourceSegment(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TestSuiteRequestError('invalid_input', `${label} é obrigatório.`);
  }
  return encodeURIComponent(normalized);
}

function invalidResponse(): TestSuiteRequestError {
  return new TestSuiteRequestError(
    'invalid_response',
    'A API devolveu um resultado de Test Lab inválido.'
  );
}

function parseSuite(value: unknown): TestSuite {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.suiteId) ||
    !isNonEmptyString(value.workspaceId) ||
    !isNonEmptyString(value.draftId) ||
    !isNonEmptyString(value.name) ||
    !isNullableString(value.description) ||
    !isNonEmptyString(value.createdByUserId) ||
    !isValidDate(value.createdAt) ||
    !isNonEmptyString(value.eTag)
  ) {
    throw invalidResponse();
  }
  return {
    suiteId: value.suiteId,
    workspaceId: value.workspaceId,
    draftId: value.draftId,
    name: value.name,
    description: value.description,
    createdByUserId: value.createdByUserId,
    createdAt: value.createdAt,
    eTag: value.eTag,
  };
}

function parseFixture(value: unknown): TestFixture {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.fixtureId) ||
    !isNonEmptyString(value.suiteId) ||
    !isNonEmptyString(value.name) ||
    typeof value.inputXml !== 'string' ||
    typeof value.expectedXml !== 'string' ||
    !isNullableString(value.xsdVersion) ||
    !isNonNegativeInteger(value.sortOrder) ||
    !isValidDate(value.createdAt)
  ) {
    throw invalidResponse();
  }
  return {
    fixtureId: value.fixtureId,
    suiteId: value.suiteId,
    name: value.name,
    inputXml: value.inputXml,
    expectedXml: value.expectedXml,
    xsdVersion: value.xsdVersion,
    sortOrder: value.sortOrder,
    createdAt: value.createdAt,
  };
}

/**
 * Shape interno de `fixtureResults` não confirmado pelo `@lp-contract-qa` — só a assinatura do
 * endpoint foi verificada no código-fonte. Validamos aqui somente os campos mínimos já usados
 * pela UI (fixture, aprovação, duração) e preservamos o restante em `raw` sem tipar mais fundo.
 */
function parseFixtureResult(value: unknown): TestSuiteFixtureResult {
  if (!isRecord(value) || !isNonEmptyString(value.fixtureId) || typeof value.passed !== 'boolean') {
    throw invalidResponse();
  }
  return {
    fixtureId: value.fixtureId,
    fixtureName: isNonEmptyString(value.fixtureName) ? value.fixtureName : value.fixtureId,
    passed: value.passed,
    durationMs: isNullableFiniteNumber(value.durationMs) ? value.durationMs : null,
    raw: value,
  };
}

function parseRun(value: unknown): TestSuiteRun {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.runId) ||
    !isNonEmptyString(value.suiteId) ||
    !isNonEmptyString(value.releaseId) ||
    !isNonEmptyString(value.executedByUserId) ||
    !isValidDate(value.executedAt) ||
    !isNonNegativeInteger(value.totalFixtures) ||
    !isNonNegativeInteger(value.passed) ||
    !isNonNegativeInteger(value.failed) ||
    typeof value.requiredGatesPassed !== 'boolean' ||
    !isNullableFiniteNumber(value.durationMs) ||
    !Array.isArray(value.fixtureResults)
  ) {
    throw invalidResponse();
  }
  return {
    runId: value.runId,
    suiteId: value.suiteId,
    releaseId: value.releaseId,
    executedByUserId: value.executedByUserId,
    executedAt: value.executedAt,
    totalFixtures: value.totalFixtures,
    passed: value.passed,
    failed: value.failed,
    requiredGatesPassed: value.requiredGatesPassed,
    durationMs: value.durationMs,
    fixtureResults: value.fixtureResults.map(parseFixtureResult),
  };
}

function parseRunListResponse(value: unknown): TestSuiteRunListResponse {
  if (!isRecord(value) || !Array.isArray(value.items) || !isNonNegativeInteger(value.totalCount)) {
    throw invalidResponse();
  }
  return {
    items: value.items.map(parseRun),
    totalCount: value.totalCount,
  };
}

function responseMessage(data: unknown): string | null {
  return isRecord(data) && isNonEmptyString(data.error) ? data.error : null;
}

function mapRequestError(error: unknown): never {
  if (error instanceof TestSuiteRequestError) throw error;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = responseMessage(error.response?.data);
    if (status === 401 || status === 403) {
      throw new TestSuiteRequestError(
        'unauthorized',
        'Sua sessão não permite concluir esta operação de Test Lab.'
      );
    }
    if (status === 404) {
      throw new TestSuiteRequestError(
        'not_found',
        'Workspace, draft, suíte ou fixture não encontrada para esta identidade.'
      );
    }
    if (status === 400 || status === 422) {
      throw new TestSuiteRequestError('rejected', message ?? 'A API recusou a operação.');
    }
    if (!error.response || status === 503 || (status !== undefined && status >= 500)) {
      throw new TestSuiteRequestError(
        'unavailable',
        'O serviço de Test Lab está temporariamente indisponível.'
      );
    }
  }
  throw new TestSuiteRequestError('request_failed', 'Não foi possível concluir a operação.');
}

export const testSuiteService = {
  async createSuite(input: CreateTestSuiteInput): Promise<TestSuite> {
    const workspace = resourceSegment(input.workspaceId, 'Workspace');
    const draft = resourceSegment(input.draftId, 'Draft');
    if (!input.name.trim()) {
      throw new TestSuiteRequestError('invalid_input', 'O nome da suíte é obrigatório.');
    }
    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/test-suites`,
        {
          name: input.name.trim(),
          ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        }
      );
      return parseSuite(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async listSuites(workspaceId: string, draftId: string): Promise<TestSuite[]> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    try {
      const response = await apiClient.get<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/test-suites`
      );
      if (!Array.isArray(response.data)) throw invalidResponse();
      return response.data.map(parseSuite);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async getSuite(workspaceId: string, draftId: string, suiteId: string): Promise<TestSuite> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    const suite = resourceSegment(suiteId, 'Suíte');
    try {
      const response = await apiClient.get<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/test-suites/${suite}`
      );
      return parseSuite(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async createFixture(input: CreateTestFixtureInput): Promise<TestFixture> {
    const workspace = resourceSegment(input.workspaceId, 'Workspace');
    const draft = resourceSegment(input.draftId, 'Draft');
    const suite = resourceSegment(input.suiteId, 'Suíte');
    if (!input.name.trim() || !input.inputXml.trim() || !input.expectedXml.trim()) {
      throw new TestSuiteRequestError(
        'invalid_input',
        'Nome, XML de entrada e XML esperado são obrigatórios para a fixture.'
      );
    }
    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/test-suites/${suite}/fixtures`,
        {
          name: input.name.trim(),
          inputXml: input.inputXml,
          expectedXml: input.expectedXml,
          ...(input.xsdVersion?.trim() ? { xsdVersion: input.xsdVersion.trim() } : {}),
        }
      );
      return parseFixture(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async listFixtures(
    workspaceId: string,
    draftId: string,
    suiteId: string
  ): Promise<TestFixture[]> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    const suite = resourceSegment(suiteId, 'Suíte');
    try {
      const response = await apiClient.get<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/test-suites/${suite}/fixtures`
      );
      if (!Array.isArray(response.data)) throw invalidResponse();
      return response.data.map(parseFixture);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  /**
   * Executa a suíte inteira contra uma release (síncrono — a API roda todas as fixtures antes
   * de responder 200, sem job/polling).
   */
  async runSuite(
    workspaceId: string,
    draftId: string,
    suiteId: string,
    releaseId: string
  ): Promise<TestSuiteRun> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    const suite = resourceSegment(suiteId, 'Suíte');
    if (!releaseId.trim()) {
      throw new TestSuiteRequestError(
        'invalid_input',
        'A release é obrigatória para executar a suíte.'
      );
    }
    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/test-suites/${suite}/run`,
        { releaseId: releaseId.trim() }
      );
      return parseRun(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async listRuns(
    workspaceId: string,
    draftId: string,
    suiteId: string,
    page = 1,
    pageSize = 20
  ): Promise<TestSuiteRunListResponse> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    const suite = resourceSegment(suiteId, 'Suíte');
    if (!Number.isInteger(page) || page < 1) {
      throw new TestSuiteRequestError('invalid_input', '"page" deve ser >= 1.');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new TestSuiteRequestError('invalid_input', '"pageSize" deve estar entre 1 e 100.');
    }
    try {
      const response = await apiClient.get<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/test-suites/${suite}/runs`,
        { params: { page, pageSize } }
      );
      return parseRunListResponse(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },
};
