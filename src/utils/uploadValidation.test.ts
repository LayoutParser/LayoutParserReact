import { describe, expect, it } from 'vitest';
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  DEFAULT_MAX_UPLOAD_MB,
  MAX_MAX_UPLOAD_MB,
  MAX_UPLOAD_FILENAME_LENGTH,
  MIN_MAX_UPLOAD_MB,
  resolveMaxUploadMb,
  validateUploadFile,
  type UploadFileCandidate,
} from './uploadValidation';

const BYTES_PER_MEGABYTE = 1024 * 1024;

const createCandidate = (
  name: string,
  size = 1,
  type = 'application/octet-stream'
): UploadFileCandidate => ({ name, size, type });

describe('resolveMaxUploadMb', () => {
  it.each([undefined, '', '   ', 'abc', '25 MB', '0x19', 'NaN', 'Infinity'])(
    'usa 25 MB para configuração inválida: %s',
    configuredValue => {
      expect(resolveMaxUploadMb(configuredValue)).toBe(DEFAULT_MAX_UPLOAD_MB);
    }
  );

  it.each(['0', '0.99', '100.01', '101', '-1'])(
    'usa o padrão quando a configuração está fora da faixa segura: %s',
    configuredValue => {
      expect(resolveMaxUploadMb(configuredValue)).toBe(DEFAULT_MAX_UPLOAD_MB);
    }
  );

  it('aceita os limites inferior e superior da faixa segura', () => {
    expect(resolveMaxUploadMb(String(MIN_MAX_UPLOAD_MB))).toBe(MIN_MAX_UPLOAD_MB);
    expect(resolveMaxUploadMb(String(MAX_MAX_UPLOAD_MB))).toBe(MAX_MAX_UPLOAD_MB);
  });

  it('aceita valor decimal dentro da faixa e ignora espaços externos', () => {
    expect(resolveMaxUploadMb(' 12.5 ')).toBe(12.5);
  });
});

describe('validateUploadFile', () => {
  it.each(ALLOWED_UPLOAD_EXTENSIONS)('aceita a extensão permitida %s', extension => {
    expect(validateUploadFile(createCandidate(`documento${extension}`))).toEqual({
      isValid: true,
      maxUploadMb: DEFAULT_MAX_UPLOAD_MB,
    });
  });

  it('trata extensão sem diferenciar maiúsculas e minúsculas', () => {
    expect(validateUploadFile(createCandidate('DOCUMENTO.MQ_SERIES')).isValid).toBe(true);
  });

  it('não confia no MIME para aceitar ou rejeitar o formato', () => {
    expect(
      validateUploadFile(createCandidate('documento.txt', 1, 'application/x-msdownload')).isValid
    ).toBe(true);
    expect(validateUploadFile(createCandidate('documento.exe', 1, 'text/plain'))).toMatchObject({
      isValid: false,
      code: 'invalid_extension',
    });
  });

  it.each(['documento.exe', 'documento', 'documento.txt.exe', 'documento.txt '])(
    'rejeita nome sem uma extensão permitida no final: %s',
    name => {
      expect(validateUploadFile(createCandidate(name))).toMatchObject({
        isValid: false,
        code: 'invalid_extension',
        message: 'Formato não permitido. Selecione um arquivo .txt, .mq_series ou .idoc.',
      });
    }
  );

  it('rejeita arquivo vazio', () => {
    expect(validateUploadFile(createCandidate('documento.idoc', 0))).toMatchObject({
      isValid: false,
      code: 'empty_file',
      message: 'O arquivo selecionado está vazio. Escolha um arquivo com conteúdo.',
    });
  });

  it('aceita nome exatamente no limite de caracteres', () => {
    const fileName = `${'a'.repeat(MAX_UPLOAD_FILENAME_LENGTH - '.txt'.length)}.txt`;
    expect(Array.from(fileName)).toHaveLength(MAX_UPLOAD_FILENAME_LENGTH);
    expect(validateUploadFile(createCandidate(fileName)).isValid).toBe(true);
  });

  it('rejeita nome acima do limite de caracteres', () => {
    const fileName = `${'a'.repeat(MAX_UPLOAD_FILENAME_LENGTH - '.txt'.length + 1)}.txt`;
    expect(validateUploadFile(createCandidate(fileName))).toMatchObject({
      isValid: false,
      code: 'name_too_long',
      message: `O nome do arquivo excede o limite de ${MAX_UPLOAD_FILENAME_LENGTH} caracteres. Renomeie o arquivo e tente novamente.`,
    });
  });

  it('conta caracteres Unicode completos no limite do nome', () => {
    const fileName = `${'😀'.repeat(MAX_UPLOAD_FILENAME_LENGTH - '.txt'.length)}.txt`;
    expect(Array.from(fileName)).toHaveLength(MAX_UPLOAD_FILENAME_LENGTH);
    expect(validateUploadFile(createCandidate(fileName)).isValid).toBe(true);
  });

  it('aceita arquivo exatamente no limite configurado', () => {
    expect(
      validateUploadFile(createCandidate('documento.txt', 2 * BYTES_PER_MEGABYTE), '2')
    ).toEqual({ isValid: true, maxUploadMb: 2 });
  });

  it('rejeita arquivo um byte acima do limite configurado', () => {
    expect(
      validateUploadFile(createCandidate('documento.txt', 2 * BYTES_PER_MEGABYTE + 1), '2')
    ).toMatchObject({
      isValid: false,
      code: 'file_too_large',
      message: 'O arquivo excede o limite de 2 MB. Escolha um arquivo menor.',
      maxUploadMb: 2,
    });
  });

  it('usa o limite padrão quando a configuração de tamanho é insegura', () => {
    expect(
      validateUploadFile(
        createCandidate('documento.txt', DEFAULT_MAX_UPLOAD_MB * BYTES_PER_MEGABYTE + 1),
        '1000'
      )
    ).toMatchObject({
      isValid: false,
      code: 'file_too_large',
      maxUploadMb: DEFAULT_MAX_UPLOAD_MB,
    });
  });
});
