import { describe, expect, it } from 'vitest';
import type { ParseErrorInfo } from '../types/api';
import { assessParseFailure, isParseFailureCause } from './parseFailure';

const errorInfo = (overrides: Partial<ParseErrorInfo>): ParseErrorInfo => ({
  kind: 'server_error',
  message: 'Falha no parse',
  ...overrides,
});

describe('parseFailure', () => {
  it.each(['parser_defect', 'document_malformed', 'layout_invalid'])(
    'reconhece a causa suportada %s',
    cause => {
      expect(isParseFailureCause(cause)).toBe(true);
    }
  );

  it.each([undefined, null, '', 'layout_mismatch', 500, {}])(
    'rejeita causa desconhecida: %s',
    cause => {
      expect(isParseFailureCause(cause)).toBe(false);
    }
  );

  it('prioriza failureCause mesmo quando o status HTTP discorda da taxonomia', () => {
    expect(
      assessParseFailure(
        errorInfo({ kind: 'parse_error', httpStatus: 422, failureCause: 'parser_defect' })
      )
    ).toEqual({ view: 'parser_defect', blamesUserArtifact: false });
  });

  it('distingue documento malformado de layout inválido', () => {
    expect(assessParseFailure(errorInfo({ failureCause: 'document_malformed' }))).toEqual({
      view: 'document_malformed',
      blamesUserArtifact: true,
    });
    expect(assessParseFailure(errorInfo({ failureCause: 'layout_invalid' }))).toEqual({
      view: 'layout_invalid',
      blamesUserArtifact: true,
    });
  });

  it('classifica falha de rede sem culpar os arquivos do usuário', () => {
    expect(assessParseFailure(errorInfo({ kind: 'network_error' }))).toEqual({
      view: 'unreachable',
      blamesUserArtifact: false,
    });
  });

  it('usa os fallbacks corretos para 422, 500 e 400 sem failureCause', () => {
    expect(assessParseFailure(errorInfo({ kind: 'parse_error', httpStatus: 422 }))).toEqual({
      view: 'document_unclassified',
      blamesUserArtifact: true,
    });
    expect(assessParseFailure(errorInfo({ httpStatus: 500 }))).toEqual({
      view: 'parser_defect',
      blamesUserArtifact: false,
    });
    expect(assessParseFailure(errorInfo({ httpStatus: 400 }))).toEqual({
      view: 'request_rejected',
      blamesUserArtifact: false,
    });
  });
});
