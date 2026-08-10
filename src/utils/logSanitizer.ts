const MAX_CONTEXT_DEPTH = 3;
const MAX_CONTEXT_KEYS = 16;
const MAX_STRING_LENGTH = 240;

const SENSITIVE_KEY_PATTERN =
  /(?:content|document|payload|body|request|response|decrypted|valueContent|txt|xml|file|stack|warnings?)/i;

const sanitizeString = (value: string): string => {
  const withoutMarkup = value.replace(/<[^>]{1,500}>/g, '[conteúdo omitido]');
  const singleLine = withoutMarkup.replace(/[\r\n\t]+/g, ' ').trim();

  return singleLine.length > MAX_STRING_LENGTH
    ? `${singleLine.slice(0, MAX_STRING_LENGTH)}…`
    : singleLine;
};

const sanitizeValue = (value: unknown, depth: number): unknown => {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    // Listas de warnings/erros podem carregar trechos do documento. Para diagnóstico do front,
    // a cardinalidade é suficiente e evita replicar conteúdo de negócio no armazenamento de logs.
    return { itemCount: value.length };
  }

  if (value instanceof Error) {
    return { name: value.name };
  }

  if (typeof value === 'object' && depth < MAX_CONTEXT_DEPTH) {
    return sanitizeRecord(value as Record<string, unknown>, depth + 1);
  }

  return String(value);
};

const sanitizeRecord = (context: Record<string, unknown>, depth = 0): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(context)
      .slice(0, MAX_CONTEXT_KEYS)
      .map(([key, value]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitizeValue(value, depth),
      ])
  );

export const sanitizeLogMessage = (message: string): string => sanitizeString(message);

export const sanitizeLogContext = (
  context?: Record<string, unknown>
): Record<string, unknown> | undefined => (context ? sanitizeRecord(context) : undefined);
