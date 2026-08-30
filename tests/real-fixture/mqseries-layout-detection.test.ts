import { readFile, readdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ParseResponse } from '../../src/types/api';

const EXPECTED = {
  documentBytes: 35_400,
  layoutName: 'LAY_TXT_MQSERIES_ENVNFE_4.00_NFe',
  physicalLines: 59,
  rawFields: 705,
} as const;

interface DetectionCandidate {
  rank: number;
  layoutGuid: string;
  name: string;
  matchScore: number;
  isTied: boolean;
  evidence: string[];
  conflicts: string[];
  limitations: string[];
}

interface AutoParseResponse {
  success: boolean;
  correlationId?: string;
  detection: {
    status: 'unique' | 'ambiguous' | 'not_found';
    detectedType: string;
    algorithmVersion: string;
    catalogVersion: string;
    totalCandidates: number;
    truncated: boolean;
    selectedLayout?: { layoutGuid: string; name: string } | null;
    candidates: DetectionCandidate[];
    suggestedCandidates?: DetectionCandidate[];
  };
  parseResult?: ParseResponse | null;
}

const fixtureDirectory = resolve(
  process.env.LAYOUTPARSER_REAL_FIXTURE_DIR?.trim() || '.codex/temp/teste'
);
const apiBaseUrl = (
  process.env.LAYOUTPARSER_REAL_API_URL?.trim() || 'http://127.0.0.1:5100'
).replace(/\/$/, '');

const loadPrivateDocument = async (): Promise<{ name: string; content: Buffer }> => {
  let files: string[];
  try {
    files = (await readdir(fixtureDirectory, { withFileTypes: true }))
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.txt'))
      .map(entry => entry.name);
  } catch {
    throw new Error(
      `Fixture real ausente. Provisione o documento privado em ${fixtureDirectory} ou defina LAYOUTPARSER_REAL_FIXTURE_DIR.`
    );
  }

  if (files.length !== 1) {
    throw new Error('A pasta privada deve conter exatamente um documento TXT homologado.');
  }

  const path = resolve(fixtureDirectory, files[0]!);
  const content = await readFile(path);
  if (content.byteLength !== EXPECTED.documentBytes) {
    throw new Error('O documento privado não corresponde à fixture MQSeries homologada.');
  }

  return { name: basename(path), content };
};

const callAutoParse = async (
  document: { name: string; content: Buffer },
  layoutGuidOverride?: string
): Promise<AutoParseResponse> => {
  const correlationId = crypto.randomUUID();
  const formData = new FormData();
  const documentBytes = new Uint8Array(document.content.byteLength);
  documentBytes.set(document.content);
  formData.set('documentFile', new File([documentBytes], document.name, { type: 'text/plain' }));
  if (layoutGuidOverride) formData.set('layoutGuidOverride', layoutGuidOverride);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/parse/auto`, {
      method: 'POST',
      headers: { 'X-Correlation-ID': correlationId },
      body: formData,
      signal: AbortSignal.timeout(180_000),
    });
  } catch (error) {
    throw new Error(
      `A API real não respondeu em ${apiBaseUrl}. Inicie a versão com /api/parse/auto ou defina LAYOUTPARSER_REAL_API_URL.`,
      { cause: error }
    );
  }

  const responseCorrelationId = response.headers.get('x-correlation-id');
  if (!response.ok) {
    throw new Error(
      `A detecção da fixture real falhou com HTTP ${response.status}${responseCorrelationId ? ` (correlationId: ${responseCorrelationId})` : ''}.`
    );
  }

  expect(responseCorrelationId).toBe(correlationId);
  const payload = (await response.json()) as AutoParseResponse;
  expect(payload.correlationId).toBe(correlationId);
  return payload;
};

describe('MQSeries real — detecção e escolha de layout', () => {
  let document: Awaited<ReturnType<typeof loadPrivateDocument>>;
  let detection: AutoParseResponse;

  beforeAll(async () => {
    document = await loadPrivateDocument();
    detection = await callAutoParse(document);
  });

  it('falha fechado e devolve até cinco equivalências explicáveis', () => {
    const candidates = detection.detection.candidates;

    expect(detection.success).toBe(true);
    expect(detection.detection.detectedType).toBe('mqseries');
    expect(detection.detection.status).toBe('ambiguous');
    expect(detection.detection.selectedLayout).toBeFalsy();
    expect(detection.parseResult).toBeFalsy();
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    expect(candidates.length).toBeLessThanOrEqual(5);
    expect(detection.detection.totalCandidates).toBeGreaterThanOrEqual(candidates.length);
    expect(detection.detection.truncated).toBe(
      detection.detection.totalCandidates > candidates.length
    );
    expect(candidates.map(candidate => candidate.rank)).toEqual(
      candidates.map((_, index) => index + 1)
    );
    expect(new Set(candidates.map(candidate => candidate.layoutGuid)).size).toBe(candidates.length);
    expect(candidates.map(candidate => candidate.matchScore)).toEqual(
      candidates.map(candidate => candidate.matchScore).toSorted((left, right) => right - left)
    );
    expect(candidates.some(candidate => candidate.name === EXPECTED.layoutName)).toBe(true);

    candidates.forEach(candidate => {
      expect(candidate.matchScore).toBeGreaterThanOrEqual(0);
      expect(candidate.matchScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(candidate.evidence)).toBe(true);
      expect(Array.isArray(candidate.conflicts)).toBe(true);
      expect(Array.isArray(candidate.limitations)).toBe(true);
    });
  });

  it('só processa depois da escolha explícita do layout homologado', async () => {
    const expected = detection.detection.candidates.find(
      candidate => candidate.name === EXPECTED.layoutName
    );
    expect(expected).toBeDefined();

    const selected = await callAutoParse(document, expected!.layoutGuid);

    expect(selected.detection.selectedLayout).toMatchObject({
      layoutGuid: expected!.layoutGuid,
      name: EXPECTED.layoutName,
    });
    expect(selected.parseResult).toMatchObject({
      success: true,
      detectedType: 'mqseries',
      layout: { name: EXPECTED.layoutName },
      summary: {
        totalLines: EXPECTED.physicalLines,
        totalFields: EXPECTED.rawFields,
      },
    });
    expect(selected.parseResult?.fields).toHaveLength(EXPECTED.rawFields);
    expect(selected.parseResult?.text).toHaveLength(EXPECTED.documentBytes);
  });
});
