import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ParseResponse } from '../../src/types/api';
import type { Field } from '../../src/types/field';
import { normalizeParseResponse } from '../../src/utils/parseFieldNormalization';
import {
  applyPositionalFieldEdit,
  inspectPositionalField,
  POSITIONAL_LINE_LENGTH,
  resolvePositionalLineIndex,
} from '../../src/utils/positionalFieldEdit';

const EXPECTED = {
  layoutGuid: 'LAY_ad4fb6f4-9ff5-44fd-988b-3da5ed56b22c',
  layoutName: 'LAY_TXT_MQSERIES_ENVNFE_4.00_NFe',
  layoutBytes: 782_256,
  documentBytes: 35_400,
  physicalLines: 59,
  rawFields: 705,
  physicalFields: 703,
  aggregateFields: 2,
} as const;

type WireField = Field & {
  start?: number;
  status?: string;
};

interface RealFixtureContext {
  raw: ParseResponse;
  normalized: ParseResponse;
  fixtureDirectory: string;
}

const fixtureDirectory = resolve(
  process.env.LAYOUTPARSER_REAL_FIXTURE_DIR?.trim() || '.codex/temp/teste'
);
const apiBaseUrl = (
  process.env.LAYOUTPARSER_REAL_API_URL?.trim() || 'http://127.0.0.1:5100'
).replace(/\/$/, '');

const groupKey = (field: Field): string =>
  [field.lineName, field.lineSequence ?? '', field.occurrence ?? 1].join('\u0000');

const loadRealFixture = async (): Promise<RealFixtureContext> => {
  let privateFiles: string[];
  try {
    privateFiles = (await readdir(fixtureDirectory, { withFileTypes: true }))
      .filter(entry => entry.isFile())
      .map(entry => entry.name);
  } catch {
    throw new Error(
      `Fixture real ausente. Mantenha os dois arquivos privados em ${fixtureDirectory} ou defina LAYOUTPARSER_REAL_FIXTURE_DIR.`
    );
  }

  const layoutFiles = privateFiles.filter(file => file.toLowerCase().endsWith('.xml'));
  const documentFiles = privateFiles.filter(file => file.toLowerCase().endsWith('.txt'));
  if (layoutFiles.length !== 1 || documentFiles.length !== 1) {
    throw new Error(
      'A pasta privada deve conter exatamente um layout XML e um documento TXT homologados.'
    );
  }

  const layoutPath = resolve(fixtureDirectory, layoutFiles[0]!);
  const documentPath = resolve(fixtureDirectory, documentFiles[0]!);

  const [layoutBuffer, documentBuffer, layoutInfo, documentInfo] = await Promise.all([
    readFile(layoutPath),
    readFile(documentPath),
    stat(layoutPath),
    stat(documentPath),
  ]);

  if (layoutInfo.size !== EXPECTED.layoutBytes || documentInfo.size !== EXPECTED.documentBytes) {
    throw new Error(
      'Os arquivos privados não correspondem ao par homologado; restaure a fixture antes de executar o cenário.'
    );
  }

  const formData = new FormData();
  formData.set(
    'layoutFile',
    new File([layoutBuffer], basename(layoutPath), { type: 'application/xml' })
  );
  formData.set(
    'txtFile',
    new File([documentBuffer], basename(documentPath), { type: 'text/plain' })
  );

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/parse/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    throw new Error(
      `A API real não respondeu em ${apiBaseUrl}. Inicie a LayoutParserApi ou defina LAYOUTPARSER_REAL_API_URL.`,
      { cause: error }
    );
  }

  if (!response.ok) {
    const correlationId = response.headers.get('x-correlation-id');
    throw new Error(
      `O parse da fixture real falhou com HTTP ${response.status}${correlationId ? ` (correlationId: ${correlationId})` : ''}.`
    );
  }

  const raw = (await response.json()) as ParseResponse;
  return { raw, normalized: normalizeParseResponse(raw), fixtureDirectory };
};

describe('MQSeries real — geometria posicional e ocorrências', () => {
  let context: RealFixtureContext;

  beforeAll(async () => {
    context = await loadRealFixture();
  });

  it('processa exatamente o par privado homologado sem expor seu conteúdo', () => {
    expect(context.fixtureDirectory).toBe(fixtureDirectory);
    expect(context.raw.success).toBe(true);
    expect(context.raw.detectedType).toBe('mqseries');
    expect(context.raw.layout?.layoutGuid).toBe(EXPECTED.layoutGuid);
    expect(context.raw.layout?.name).toBe(EXPECTED.layoutName);
    expect(context.raw.summary?.totalLines).toBe(EXPECTED.physicalLines);
    expect(context.raw.summary?.totalFields).toBe(EXPECTED.rawFields);
    expect(context.raw.summary?.errorFields).toBe(0);
    expect(context.raw.text?.length).toBe(EXPECTED.documentBytes);
    expect(context.raw.fields?.length).toBe(EXPECTED.rawFields);
  });

  it('remove somente as duas entradas agregadas e preserva os 703 campos físicos', () => {
    const rawFields = (context.raw.fields ?? []) as WireField[];
    const aggregateFields = rawFields.filter(
      field => field.isAggregatedOccurrence || field.occurrence === 0
    );
    const normalizedFields = context.normalized.fields ?? [];

    expect(aggregateFields.length).toBe(EXPECTED.aggregateFields);
    expect(normalizedFields.length).toBe(EXPECTED.physicalFields);
    expect(
      normalizedFields.some(field => field.isAggregatedOccurrence || field.occurrence === 0)
    ).toBe(false);
  });

  it('recupera do layout a largura dos 488 valores vazios e cobre cada linha até a posição 600', () => {
    const rawPhysicalFields = ((context.raw.fields ?? []) as WireField[]).filter(
      field => !field.isAggregatedOccurrence && field.occurrence !== 0
    );
    const normalizedFields = context.normalized.fields ?? [];
    const groups = new Map<string, Field[]>();

    expect(rawPhysicalFields.filter(field => field.length === 0).length).toBe(488);

    normalizedFields.forEach(field => {
      const fields = groups.get(groupKey(field)) ?? [];
      fields.push(field);
      groups.set(groupKey(field), fields);

      expect(field.startPosition, `${field.lineName}.${field.fieldName}`).toBeGreaterThan(0);
      expect(field.length, `${field.lineName}.${field.fieldName}`).toBeGreaterThan(0);
      expect(field.fieldGuid, `${field.lineName}.${field.fieldName}`).toBeTruthy();
      expect(field.lineGuid, `${field.lineName}.${field.fieldName}`).toBeTruthy();
      expect(field.startPosition! + field.length! - 1).toBeLessThanOrEqual(POSITIONAL_LINE_LENGTH);
    });

    expect(groups.size).toBe(EXPECTED.physicalLines);
    groups.forEach((fields, key) => {
      const ordered = fields.toSorted((left, right) => left.startPosition! - right.startPosition!);
      for (let index = 1; index < ordered.length; index += 1) {
        expect(ordered[index]!.startPosition, `${key}: lacuna ou sobreposição`).toBe(
          ordered[index - 1]!.startPosition! + ordered[index - 1]!.length!
        );
      }
      const last = ordered.at(-1)!;
      expect(last.startPosition! + last.length! - 1, `${key}: fim da linha`).toBe(
        POSITIONAL_LINE_LENGTH
      );
    });
  });

  it('torna editável o NroProtocoloAutorizacao vazio nas posições 75–89 da linha física 2', () => {
    const fields = context.normalized.fields ?? [];
    const targetIndex = fields.findIndex(
      field => field.lineName === 'LINHA000' && field.fieldName === 'NroProtocoloAutorizacao'
    );
    const target = fields[targetIndex]!;
    const keys = [...new Set(fields.map(groupKey))];
    const lineIndex = resolvePositionalLineIndex(
      context.normalized.text!,
      target.lineSequence,
      target.lineName,
      target.occurrence,
      keys.indexOf(groupKey(target)),
      keys.length
    );
    const inspection = inspectPositionalField(context.normalized.text!, {
      field: target,
      fieldIndex: targetIndex,
      lineIndex,
    });

    expect(target).toMatchObject({
      startPosition: 75,
      length: 15,
      parsedLength: 0,
      occurrence: 1,
      lineSequence: '000001',
      fieldGuid: 'FLD_d7bc67e7-bdcd-414f-97fb-72508a3973fa',
      lineGuid: 'LIN_c8ce20d4-62a9-44ca-aa64-20bdadfc7f9a',
    });
    expect(lineIndex).toBe(1);
    expect(inspection).toMatchObject({
      editable: true,
      currentValue: ' '.repeat(15),
      expectedLength: 15,
      startOffset: 674,
      endOffset: 689,
    });

    const replacement = 'N'.repeat(15);
    const edited = applyPositionalFieldEdit(
      context.normalized.text!,
      { field: target, fieldIndex: targetIndex, lineIndex },
      replacement
    );
    expect(edited.content.length).toBe(context.normalized.text!.length);
    expect(edited.content.slice(edited.startOffset, edited.endOffset)).toBe(replacement);
    expect(
      edited.content.slice(0, edited.startOffset) ===
        context.normalized.text!.slice(0, edited.startOffset)
    ).toBe(true);
    expect(
      edited.content.slice(edited.endOffset) === context.normalized.text!.slice(edited.endOffset)
    ).toBe(true);
  });

  it('mantém as quatro LINHA081 em índices físicos únicos e nunca recria a linha agregada no fim', () => {
    const fields = context.normalized.fields ?? [];
    const keys = [...new Set(fields.map(groupKey))];
    const line81 = fields.filter(field => field.lineName === 'LINHA081');
    const occurrences = [...new Set(line81.map(field => field.occurrence))];
    const physicalIndexes = occurrences.map(occurrence => {
      const field = line81.find(item => item.occurrence === occurrence)!;
      return resolvePositionalLineIndex(
        context.normalized.text!,
        field.lineSequence,
        field.lineName,
        field.occurrence,
        keys.indexOf(groupKey(field)),
        keys.length
      );
    });

    expect(line81.length).toBe(8);
    expect(occurrences).toEqual([1, 2, 3, 4]);
    // O sequencial 000037 começa no índice físico 38 porque o HEADER ocupa o índice zero.
    expect(physicalIndexes).toEqual([38, 39, 40, 41]);
    expect(new Set(physicalIndexes)).toHaveLength(4);
    expect(Math.max(...physicalIndexes)).toBeLessThan(EXPECTED.physicalLines - 1);
  });

  it('consegue localizar e inspecionar com segurança todos os 703 campos físicos', () => {
    const fields = context.normalized.fields ?? [];
    const keys = [...new Set(fields.map(groupKey))];
    const failures = fields.flatMap((field, fieldIndex) => {
      const lineIndex = resolvePositionalLineIndex(
        context.normalized.text!,
        field.lineSequence,
        field.lineName,
        field.occurrence,
        keys.indexOf(groupKey(field)),
        keys.length
      );
      const inspection = inspectPositionalField(context.normalized.text!, {
        field,
        fieldIndex,
        lineIndex,
      });

      return inspection.editable
        ? []
        : [
            {
              lineName: field.lineName,
              fieldName: field.fieldName,
              occurrence: field.occurrence,
              reason: inspection.reason,
            },
          ];
    });

    expect(failures).toEqual([]);
  });
});
