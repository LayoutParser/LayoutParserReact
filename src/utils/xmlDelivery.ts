/**
 * Formata XML somente para leitura na interface. O conteúdo bruto recebido da API continua
 * sendo a fonte usada nas ações de copiar e baixar.
 */
export const formatXmlForDisplay = (xml: string): string => {
  if (!xml || xml.includes('<![CDATA[')) {
    return xml;
  }

  try {
    const withLineBreaks = xml.replace(/>\s*</g, '><').replace(/></g, '>\n<');
    const indentUnit = '  ';
    let indentLevel = 0;
    let isInsideComment = false;

    return withLineBreaks
      .split('\n')
      .map(rawLine => {
        const line = rawLine.trim();
        if (!line) return '';

        const isClosingTag = /^<\/[^>]+>$/.test(line);
        const startsComment = line.startsWith('<!--');
        const isCommentLine = isInsideComment || startsComment;

        if (startsComment && !line.endsWith('-->')) {
          isInsideComment = true;
        }

        if (isCommentLine && line.endsWith('-->')) {
          isInsideComment = false;
        }

        const isSelfClosingOrDirective =
          line.endsWith('/>') || (line.startsWith('<?') && line.endsWith('?>')) || isCommentLine;
        const isOpenAndCloseSameLine = /^<([^\s/>]+)[^>]*>.*<\/\1>$/.test(line);

        if (isClosingTag && indentLevel > 0) {
          indentLevel -= 1;
        }

        const indented = indentUnit.repeat(indentLevel) + line;

        if (!isClosingTag && !isSelfClosingOrDirective && !isOpenAndCloseSameLine) {
          indentLevel += 1;
        }

        return indented;
      })
      .join('\n');
  } catch {
    return xml;
  }
};

/** Gera um nome seguro e previsível para entregar o XML como arquivo. */
export const createXmlFileName = (layoutName: string, candidateId: string): string => {
  const sanitize = (value: string): string =>
    value
      .trim()
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'transformacao';

  return `${sanitize(layoutName)}-${sanitize(candidateId)}.xml`;
};

/** Copia também em HTTP/intranets, onde a Clipboard API moderna pode não estar disponível. */
export const copyTextToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();

  try {
    if (!document.execCommand('copy')) {
      throw new Error('O navegador recusou a cópia para a área de transferência.');
    }
  } finally {
    textArea.remove();
  }
};
