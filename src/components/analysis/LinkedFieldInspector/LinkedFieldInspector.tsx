import React, { useCallback, useMemo, useState } from 'react';

import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useAppStore } from '../../../store/useAppStore';
import { useFieldStore } from '../../../store/useFieldStore';
import { useTraceabilityStore } from '../../../store/useTraceabilityStore';
import { useTransformationStore } from '../../../store/useTransformationStore';
import type { Field } from '../../../types/field';
import type { FieldMapping } from '../../../types/transformation';
import { getFieldPhysicalId, isSamePhysicalField } from '../../../utils/fieldIdentity';
import {
  getMappingsForField,
  getMappingsForXmlNode,
  resolveSourceFields,
  resolveTargetNodes,
} from '../../../utils/fieldMapping';
import type { PositionalFieldTarget } from '../../../utils/positionalFieldEdit';
import { resolvePositionalLineIndex } from '../../../utils/positionalFieldEdit';
import { flattenXmlTree, parseXmlToTree } from '../../../utils/xmlTree';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import FieldEditor from '../FieldEditor/FieldEditor';
import MappingConfidenceBadge from './MappingConfidenceBadge';
import './LinkedFieldInspector.css';

const KIND_LABEL: Record<FieldMapping['kind'], string> = {
  Direct: 'Vínculo direto',
  Transformed: 'Valor transformado por regra',
  Concatenated: 'Múltiplas origens concatenadas',
  Static: 'Valor estático do mapeador',
};

const uniqueFields = (fields: Field[]): Field[] => {
  const seen = new Set<string>();
  return fields.filter(field => {
    const id = getFieldPhysicalId(field);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const LinkedFieldInspector: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const { fields, parseResult, txtContent, documentSource, editPositionalField } = useAppStore();
  const { selectedField, selectField } = useFieldStore();
  const {
    selectedXmlNode,
    inspectorOpen,
    setInspectorOpen,
    selectXmlNode,
    requestXmlNodeFocus,
    requestFieldFocus,
  } = useTraceabilityStore();
  const {
    candidates,
    activeCandidateId,
    setActiveMode,
    clearCandidates,
    setDiagnostic,
    setDiagnosticError,
  } = useTransformationStore();
  const [editorTarget, setEditorTarget] = useState<PositionalFieldTarget | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const actualFields = useMemo(
    () => (fields.length > 0 ? fields : (parseResult?.fields ?? [])),
    [fields, parseResult?.fields]
  );
  const activeCandidate =
    candidates.find(candidate => candidate.candidateId === activeCandidateId) ??
    candidates[0] ??
    null;
  const { root } = useMemo(
    () =>
      parseXmlToTree(activeCandidate?.transformedXml ?? '', activeCandidate?.xmlNamespaces ?? {}),
    [activeCandidate?.transformedXml, activeCandidate?.xmlNamespaces]
  );
  const xmlNodes = useMemo(() => flattenXmlTree(root), [root]);
  const fieldMappings = activeCandidate?.fieldMappings;
  const sectionMappings = activeCandidate?.sectionMappings;

  const selectedMappings = useMemo(() => {
    if (!Array.isArray(fieldMappings)) return [];
    if (selectedField) return getMappingsForField(fieldMappings, selectedField);
    if (selectedXmlNode) return getMappingsForXmlNode(fieldMappings, xmlNodes, selectedXmlNode);
    return [];
  }, [fieldMappings, selectedField, selectedXmlNode, xmlNodes]);

  const relatedFields = useMemo(
    () =>
      uniqueFields(
        selectedMappings.flatMap(mapping =>
          mapping.sources.flatMap(source => resolveSourceFields(actualFields, source))
        )
      ),
    [actualFields, selectedMappings]
  );

  const relatedTargets = useMemo(() => {
    const seen = new Set<string>();
    return selectedMappings
      .flatMap(mapping => mapping.targets.flatMap(target => resolveTargetNodes(xmlNodes, target)))
      .filter(node => {
        if (seen.has(node.id)) return false;
        seen.add(node.id);
        return true;
      });
  }, [selectedMappings, xmlNodes]);

  const selectedSectionMappings = useMemo(() => {
    if (!Array.isArray(sectionMappings)) return [];
    if (selectedField) {
      const fieldLineGuid = (selectedField.lineGuid ?? '').replace(/[{}]/g, '').toLowerCase();
      return sectionMappings.filter(mapping => {
        const sourceLineGuid = (mapping.source.lineGuid ?? '').replace(/[{}]/g, '').toLowerCase();
        return sourceLineGuid && fieldLineGuid
          ? sourceLineGuid === fieldLineGuid
          : mapping.source.lineName === selectedField.lineName;
      });
    }
    if (selectedXmlNode) {
      return sectionMappings.filter(mapping =>
        mapping.targets.some(target =>
          resolveTargetNodes(xmlNodes, {
            xpath: target.xPath,
            nodeKind: target.nodeKind === 'attribute' ? 'Attribute' : 'Element',
            xmlOccurrence: target.xmlOccurrence,
          }).some(node => node.id === selectedXmlNode.id)
        )
      );
    }
    return [];
  }, [sectionMappings, selectedField, selectedXmlNode, xmlNodes]);

  const sectionTargetNodes = useMemo(
    () =>
      selectedSectionMappings.flatMap(mapping =>
        mapping.targets.flatMap(target =>
          resolveTargetNodes(xmlNodes, {
            xpath: target.xPath,
            nodeKind: target.nodeKind === 'attribute' ? 'Attribute' : 'Element',
            xmlOccurrence: target.xmlOccurrence,
          })
        )
      ),
    [selectedSectionMappings, xmlNodes]
  );

  const buildEditorTarget = (field: Field): PositionalFieldTarget | null => {
    const fieldIndex = actualFields.findIndex(candidate => isSamePhysicalField(candidate, field));
    if (fieldIndex < 0) return null;
    const lineKeys = Array.from(
      new Set(
        actualFields.map(
          candidate =>
            `${candidate.lineName}\u0000${candidate.lineSequence ?? ''}\u0000${candidate.occurrence ?? 1}`
        )
      )
    );
    const lineKey = `${field.lineName}\u0000${field.lineSequence ?? ''}\u0000${field.occurrence ?? 1}`;
    const fallbackLineIndex = Math.max(0, lineKeys.indexOf(lineKey));
    const lineIndex = resolvePositionalLineIndex(
      txtContent,
      field.lineSequence,
      field.occurrence,
      fallbackLineIndex,
      lineKeys.length
    );
    return { field: actualFields[fieldIndex]!, fieldIndex, lineIndex };
  };

  const closeInspector = useCallback(() => setInspectorOpen(false), [setInspectorOpen]);

  const handleViewXml = () => {
    const target = relatedTargets[0];
    if (!target) return;
    setInspectorOpen(false);
    setActiveMode('xml-transformacao');
    requestXmlNodeFocus(target);
  };

  const handleViewTxt = (field: Field) => {
    setInspectorOpen(false);
    selectXmlNode(null);
    selectField(field);
    requestFieldFocus(getFieldPhysicalId(field));
    setActiveMode('txt-posicional');
  };

  const handleSave = (target: PositionalFieldTarget, value: string) => {
    editPositionalField(target, value);
    clearCandidates();
    setDiagnostic(null);
    setDiagnosticError(null);
    selectXmlNode(null);
    setFeedback(
      `${target.field.fieldName} atualizado. Gere novamente a transformação para recompor os vínculos XML.`
    );
  };

  const mappingsState = (() => {
    if (!activeCandidate) return 'Gere e selecione uma transformação para consultar os vínculos.';
    if (fieldMappings === null || fieldMappings === undefined) {
      return 'Rastreabilidade por campo indisponível neste candidato.';
    }
    if (fieldMappings.length === 0) {
      return 'O candidato suporta rastreabilidade, mas não encontrou vínculos de campo.';
    }
    if ((selectedField || selectedXmlNode) && selectedMappings.length === 0) {
      return activeCandidate.sectionMappings && activeCandidate.sectionMappings.length > 0
        ? 'Nenhum vínculo exato de campo. Há relação disponível somente por seção.'
        : 'Nenhum vínculo foi encontrado para esta seleção.';
    }
    return null;
  })();

  const content = (
    <div className="linked-field-inspector__content">
      {!selectedField && !selectedXmlNode ? (
        <p className="linked-field-inspector__empty">
          Selecione um campo no TXT ou um nó no XML para inspecionar sua proveniência.
        </p>
      ) : (
        <>
          <div className="linked-field-inspector__selection">
            <span className="linked-field-inspector__eyebrow">
              {selectedField ? 'Origem TXT' : 'Destino XML'}
            </span>
            <strong>{selectedField?.fieldName ?? selectedXmlNode?.name}</strong>
            {selectedField && (
              <span>
                {selectedField.lineName} · ocorrência {selectedField.occurrence ?? 1}
              </span>
            )}
            {selectedField?.startPosition && selectedField.length && (
              <span>
                Posições {selectedField.startPosition}–
                {selectedField.startPosition + selectedField.length - 1} · {selectedField.length}{' '}
                caracteres
              </span>
            )}
            {selectedXmlNode && <code>{selectedXmlNode.xpath}</code>}
          </div>

          {mappingsState && <p className="linked-field-inspector__state">{mappingsState}</p>}

          {selectedMappings.map(mapping => (
            <section className="linked-field-inspector__mapping" key={mapping.mappingId}>
              <div className="linked-field-inspector__mapping-heading">
                <strong>{KIND_LABEL[mapping.kind]}</strong>
                <MappingConfidenceBadge confidence={mapping.confidence} />
              </div>
              <p>
                {mapping.sources.length} origem(ns) → {mapping.targets.length} destino(s)
              </p>
              {mapping.limitations && mapping.limitations.length > 0 && (
                <ul className="linked-field-inspector__limitations">
                  {mapping.limitations.map((limitation, index) => (
                    <li key={`${mapping.mappingId}-limitation-${index}`}>{limitation}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {relatedFields.length > 0 && (
            <section className="linked-field-inspector__relations">
              <h3>Origens TXT</h3>
              <ol>
                {relatedFields.map(field => (
                  <li key={getFieldPhysicalId(field)}>
                    <span>
                      {field.lineName} / {field.fieldName} · ocorrência {field.occurrence ?? 1}
                    </span>
                    <Button variant="secondary" onClick={() => handleViewTxt(field)}>
                      Ver no TXT
                    </Button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {selectedMappings.length > 0 && (
            <section className="linked-field-inspector__relations">
              <h3>Destinos XML</h3>
              <ol>
                {selectedMappings.flatMap(mapping =>
                  mapping.targets.map((target, index) => (
                    <li key={`${mapping.mappingId}-${target.xpath}-${index}`}>
                      <code>{target.xpath}</code>
                    </li>
                  ))
                )}
              </ol>
              {relatedTargets.length > 0 && <Button onClick={handleViewXml}>Ver no XML</Button>}
            </section>
          )}

          {selectedSectionMappings.length > 0 && (
            <section className="linked-field-inspector__relations linked-field-inspector__section-only">
              <h3>Relação por seção</h3>
              <p>
                Este vínculo identifica um bloco do documento, não a posição física exata de um
                campo. Ele serve somente para navegação estrutural.
              </p>
              <ul>
                {selectedSectionMappings.map((mapping, mappingIndex) => (
                  <li key={`${mapping.source.lineName}-${mappingIndex}`}>
                    <span>
                      {mapping.source.lineName} · ocorrência estrutural{' '}
                      {mapping.source.lineOccurrence}
                    </span>
                    {mapping.targets.map(target => (
                      <code key={`${target.xPath}-${target.xmlOccurrence}`}>{target.xPath}</code>
                    ))}
                  </li>
                ))}
              </ul>
              {sectionTargetNodes[0] && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setInspectorOpen(false);
                    setActiveMode('xml-transformacao');
                    requestXmlNodeFocus(sectionTargetNodes[0]!);
                  }}
                >
                  Ver seção no XML
                </Button>
              )}
            </section>
          )}

          {selectedField && (
            <Button
              onClick={() => {
                const target = buildEditorTarget(selectedField);
                if (target) {
                  setInspectorOpen(false);
                  setEditorTarget(target);
                }
              }}
            >
              Editar valor
            </Button>
          )}

          {feedback && (
            <p className="linked-field-inspector__feedback" role="status">
              {feedback}
            </p>
          )}
        </>
      )}
      <p className="linked-field-inspector__caveat">
        “Declarado no mapeador” descreve a regra estrutural; ainda não significa validação contra o
        LowCodeRunner de produção.
      </p>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Modal
          isOpen={inspectorOpen}
          onClose={closeInspector}
          title="Inspetor de rastreabilidade"
          size="large"
        >
          {content}
        </Modal>
      ) : (
        <aside className="linked-field-inspector" aria-label="Inspetor de rastreabilidade">
          <div className="linked-field-inspector__header">
            <div>
              <span>TXT ↔ XML</span>
              <h2>Inspetor</h2>
            </div>
          </div>
          {content}
        </aside>
      )}
      <FieldEditor
        key={editorTarget ? `${editorTarget.lineIndex}-${editorTarget.fieldIndex}` : 'closed'}
        content={txtContent}
        target={editorTarget}
        encoding={documentSource?.encoding}
        onClose={() => setEditorTarget(null)}
        onSave={handleSave}
      />
    </>
  );
};

export default LinkedFieldInspector;
