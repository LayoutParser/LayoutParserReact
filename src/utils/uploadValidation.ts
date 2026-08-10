export const ALLOWED_UPLOAD_EXTENSIONS = ['.txt', '.mq_series', '.idoc'] as const;

export const DEFAULT_MAX_UPLOAD_MB = 25;
export const MIN_MAX_UPLOAD_MB = 1;
export const MAX_MAX_UPLOAD_MB = 100;
export const MAX_UPLOAD_FILENAME_LENGTH = 255;

const BYTES_PER_MEGABYTE = 1024 * 1024;
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

export type UploadValidationErrorCode =
  | 'empty_file'
  | 'invalid_extension'
  | 'name_too_long'
  | 'file_too_large';

export type UploadValidationResult =
  | { isValid: true; maxUploadMb: number }
  | {
      isValid: false;
      code: UploadValidationErrorCode;
      message: string;
      maxUploadMb: number;
    };

export interface UploadFileCandidate {
  readonly name: string;
  readonly size: number;
  readonly type?: string;
}

/**
 * Resolve o limite configurado sem permitir que valores inválidos ou excessivos
 * enfraqueçam a proteção padrão do upload.
 */
export const resolveMaxUploadMb = (configuredValue?: string): number => {
  const normalizedValue = configuredValue?.trim();

  if (!normalizedValue || !DECIMAL_NUMBER_PATTERN.test(normalizedValue)) {
    return DEFAULT_MAX_UPLOAD_MB;
  }

  const parsedValue = Number(normalizedValue);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < MIN_MAX_UPLOAD_MB ||
    parsedValue > MAX_MAX_UPLOAD_MB
  ) {
    return DEFAULT_MAX_UPLOAD_MB;
  }

  return parsedValue;
};

const hasAllowedExtension = (fileName: string): boolean => {
  const normalizedName = fileName.toLocaleLowerCase('en-US');
  return ALLOWED_UPLOAD_EXTENSIONS.some(extension => normalizedName.endsWith(extension));
};

const formatMegabytes = (megabytes: number): string =>
  Number.isInteger(megabytes) ? megabytes.toString() : megabytes.toFixed(2).replace(/0+$/, '');

/**
 * Validação antecipada para feedback imediato. A API continua sendo a fronteira
 * autoritativa de segurança; MIME não é usado porque pode ser informado pelo cliente.
 */
export const validateUploadFile = (
  file: UploadFileCandidate,
  configuredMaxUploadMb?: string
): UploadValidationResult => {
  const maxUploadMb = resolveMaxUploadMb(configuredMaxUploadMb);

  if (Array.from(file.name).length > MAX_UPLOAD_FILENAME_LENGTH) {
    return {
      isValid: false,
      code: 'name_too_long',
      message: `O nome do arquivo excede o limite de ${MAX_UPLOAD_FILENAME_LENGTH} caracteres. Renomeie o arquivo e tente novamente.`,
      maxUploadMb,
    };
  }

  if (!hasAllowedExtension(file.name)) {
    return {
      isValid: false,
      code: 'invalid_extension',
      message: 'Formato não permitido. Selecione um arquivo .txt, .mq_series ou .idoc.',
      maxUploadMb,
    };
  }

  if (file.size <= 0) {
    return {
      isValid: false,
      code: 'empty_file',
      message: 'O arquivo selecionado está vazio. Escolha um arquivo com conteúdo.',
      maxUploadMb,
    };
  }

  if (file.size > maxUploadMb * BYTES_PER_MEGABYTE) {
    return {
      isValid: false,
      code: 'file_too_large',
      message: `O arquivo excede o limite de ${formatMegabytes(maxUploadMb)} MB. Escolha um arquivo menor.`,
      maxUploadMb,
    };
  }

  return { isValid: true, maxUploadMb };
};
