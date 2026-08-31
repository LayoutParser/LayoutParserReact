import type { Layout } from '../types/layout';
import type { LayoutDetectionProvenance, ParsedDocumentProvenance } from '../types/provenance';
import type { DocumentSource } from './documentEncoding';

export const createParsedDocumentProvenance = (
  source: DocumentSource,
  layout: Layout,
  detection?: LayoutDetectionProvenance
): ParsedDocumentProvenance => ({
  document: {
    name: source.name,
    originalSize: source.originalSize,
    lastModified: source.lastModified,
    encoding: source.encoding,
  },
  layout: {
    layoutGuid: layout.layoutGuid,
    name: layout.name,
    ...(layout.version ? { version: layout.version } : {}),
  },
  ...(detection ? { detection } : {}),
});

export const layoutMatchesProvenance = (
  layout: Layout | null,
  provenance: ParsedDocumentProvenance | null
): boolean => {
  if (!layout || !provenance) return false;

  if (provenance.layout.layoutGuid && layout.layoutGuid) {
    return provenance.layout.layoutGuid === layout.layoutGuid;
  }

  return provenance.layout.name === layout.name;
};

export const fileMatchesProvenance = (
  file: File | null,
  provenance: ParsedDocumentProvenance | null
): boolean =>
  Boolean(
    file &&
    provenance &&
    file.name === provenance.document.name &&
    file.size === provenance.document.originalSize &&
    file.lastModified === provenance.document.lastModified
  );
