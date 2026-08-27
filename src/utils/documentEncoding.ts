export type DocumentEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252';

export interface DocumentSource {
  name: string;
  mediaType: string;
  lastModified: number;
  encoding: DocumentEncoding;
  hasBom: boolean;
  originalSize: number;
}

const UTF8_BOM = Uint8Array.from([0xef, 0xbb, 0xbf]);
const UTF16_LE_BOM = Uint8Array.from([0xff, 0xfe]);
const UTF16_BE_BOM = Uint8Array.from([0xfe, 0xff]);

const WINDOWS_1252_BYTES: Readonly<Record<string, number>> = {
  '€': 0x80,
  '‚': 0x82,
  ƒ: 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  ˆ: 0x88,
  '‰': 0x89,
  Š: 0x8a,
  '‹': 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  š: 0x9a,
  '›': 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
};

const startsWith = (bytes: Uint8Array, prefix: Uint8Array): boolean =>
  prefix.every((value, index) => bytes[index] === value);

const isUtf8 = (bytes: Uint8Array): boolean => {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
};

const looksLikeUtf16 = (bytes: Uint8Array, zeroByteParity: 0 | 1): boolean => {
  if (bytes.length < 4 || bytes.length % 2 !== 0) return false;

  let expectedZeros = 0;
  let oppositeZeros = 0;
  const pairCount = bytes.length / 2;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0) continue;
    if (index % 2 === zeroByteParity) expectedZeros += 1;
    else oppositeZeros += 1;
  }

  return expectedZeros / pairCount >= 0.3 && expectedZeros > oppositeZeros * 2;
};

/**
 * Detecta somente encodings que o navegador consegue devolver sem conversão destrutiva.
 * Arquivos ASCII são classificados como UTF-8; os bytes são idênticos em Windows-1252.
 */
export const inspectDocumentSource = async (file: File): Promise<DocumentSource> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let encoding: DocumentEncoding;
  let hasBom = false;

  if (startsWith(bytes, UTF8_BOM)) {
    encoding = 'utf-8';
    hasBom = true;
  } else if (startsWith(bytes, UTF16_LE_BOM)) {
    encoding = 'utf-16le';
    hasBom = true;
  } else if (startsWith(bytes, UTF16_BE_BOM)) {
    encoding = 'utf-16be';
    hasBom = true;
  } else if (looksLikeUtf16(bytes, 1)) {
    encoding = 'utf-16le';
  } else if (looksLikeUtf16(bytes, 0)) {
    encoding = 'utf-16be';
  } else if (isUtf8(bytes)) {
    encoding = 'utf-8';
  } else {
    encoding = 'windows-1252';
  }

  return {
    name: file.name,
    mediaType: file.type || 'text/plain',
    lastModified: file.lastModified,
    encoding,
    hasBom,
    originalSize: file.size,
  };
};

const encodeUtf16 = (content: string, littleEndian: boolean): Uint8Array => {
  const bytes = new Uint8Array(content.length * 2);

  for (let index = 0; index < content.length; index += 1) {
    const codeUnit = content.charCodeAt(index);
    const offset = index * 2;
    bytes[offset] = littleEndian ? codeUnit & 0xff : codeUnit >> 8;
    bytes[offset + 1] = littleEndian ? codeUnit >> 8 : codeUnit & 0xff;
  }

  return bytes;
};

const encodeWindows1252 = (content: string): Uint8Array => {
  const bytes: number[] = [];

  for (const character of content) {
    const mapped = WINDOWS_1252_BYTES[character];
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }

    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    throw new Error(
      `O caractere “${character}” não pode ser representado no encoding Windows-1252 do arquivo.`
    );
  }

  return Uint8Array.from(bytes);
};

const prependBom = (content: Uint8Array, bom: Uint8Array): Uint8Array => {
  const bytes = new Uint8Array(bom.length + content.length);
  bytes.set(bom);
  bytes.set(content, bom.length);
  return bytes;
};

export const encodeDocumentContent = (
  content: string,
  encoding: DocumentEncoding,
  hasBom = false
): Uint8Array => {
  if (encoding === 'windows-1252') {
    return encodeWindows1252(content);
  }

  if (encoding === 'utf-16le') {
    const bytes = encodeUtf16(content, true);
    return hasBom ? prependBom(bytes, UTF16_LE_BOM) : bytes;
  }

  if (encoding === 'utf-16be') {
    const bytes = encodeUtf16(content, false);
    return hasBom ? prependBom(bytes, UTF16_BE_BOM) : bytes;
  }

  const bytes = new TextEncoder().encode(content);
  return hasBom ? prependBom(bytes, UTF8_BOM) : bytes;
};

export const assertEncodedReplacementSize = (
  currentValue: string,
  nextValue: string,
  encoding: DocumentEncoding
): void => {
  const currentLength = encodeDocumentContent(currentValue, encoding).byteLength;
  const nextLength = encodeDocumentContent(nextValue, encoding).byteLength;

  if (currentLength !== nextLength) {
    throw new Error(
      `O novo valor ocupa ${nextLength} bytes em ${encoding}, mas o intervalo atual ocupa ${currentLength}. Use caracteres com o mesmo tamanho no encoding original.`
    );
  }
};

export const createDocumentFile = (
  content: string,
  source: DocumentSource,
  enforceOriginalSize = true
): File => {
  const bytes = encodeDocumentContent(content, source.encoding, source.hasBom);

  if (enforceOriginalSize && bytes.byteLength !== source.originalSize) {
    throw new Error(
      `O documento editado teria ${bytes.byteLength} bytes, mas o original possui ${source.originalSize}. O arquivo não foi gerado para evitar deslocamento posicional.`
    );
  }

  // `Uint8Array` passou a carregar `ArrayBufferLike` nos tipos mais novos do Node, enquanto
  // `BlobPart` aceita somente um `ArrayBuffer` concreto. A cópia também impede que um buffer
  // compartilhado externo seja retido pelo File.
  const fileBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(fileBuffer).set(bytes);

  return new File([fileBuffer], source.name, {
    type: source.mediaType,
    lastModified: source.lastModified,
  });
};

export const createEditedDocumentName = (name: string): string => {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex <= 0) return `${name || 'documento'}-editado.txt`;
  return `${name.slice(0, dotIndex)}-editado${name.slice(dotIndex)}`;
};
