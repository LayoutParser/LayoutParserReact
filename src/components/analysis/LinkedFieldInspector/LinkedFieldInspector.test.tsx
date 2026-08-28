import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../../store/useAppStore';
import { useFieldStore } from '../../../store/useFieldStore';
import { useTraceabilityStore } from '../../../store/useTraceabilityStore';
import { useTransformationStore } from '../../../store/useTransformationStore';
import type { Field } from '../../../types/field';
import LinkedFieldInspector from './LinkedFieldInspector';

const field: Field = {
  lineGuid: '{line-guid}',
  lineName: 'LINHA081',
  fieldGuid: '{field-guid}',
  fieldName: 'CNPJ',
  occurrence: 3,
  lineSequence: '000003',
  startPosition: 42,
  length: 14,
  value: '12345678901234',
};

describe('LinkedFieldInspector', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useFieldStore.getState().reset();
    useTraceabilityStore.getState().reset();
    useTransformationStore.getState().reset();
    useAppStore.setState({
      fields: [field],
      txtContent: `${' '.repeat(41)}${field.value}${' '.repeat(545)}`,
      parseResult: { success: true, fields: [field] },
    });
    useFieldStore.getState().setFields([field]);
    useFieldStore.getState().selectField(field);
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('exibe confiança, limitações e navega estruturalmente do TXT ao XML', () => {
    useTransformationStore.getState().setCandidatesResult(
      [
        {
          candidateId: 'sysmiddle-1',
          pathway: 'sysmiddle',
          transformedXml:
            '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe><emit><CNPJ>12345678901234</CNPJ></emit></infNFe></NFe>',
          score: null,
          segmentMappings: null,
          validation: null,
          failureReason: null,
          xmlNamespaces: { nfe: 'http://www.portalfiscal.inf.br/nfe' },
          sectionMappings: [],
          fieldMappings: [
            {
              mappingId: 'mapping-1',
              sources: [
                {
                  lineGuid: 'line-guid',
                  lineName: 'LINHA081',
                  fieldGuid: 'field-guid',
                  fieldName: 'CNPJ',
                  lineOccurrence: 3,
                  startPosition: 42,
                  length: 14,
                },
              ],
              targets: [
                {
                  xpath: '/nfe:NFe/nfe:infNFe/nfe:emit/nfe:CNPJ',
                  nodeKind: 'Text',
                  xmlOccurrence: null,
                },
              ],
              kind: 'Transformed',
              confidence: 'BestEffort',
              limitations: ['Função do mapper não consta no catálogo conhecido.'],
            },
          ],
        },
      ],
      []
    );

    render(<LinkedFieldInspector />);

    expect(screen.getByText('Melhor estimativa')).toBeInTheDocument();
    expect(screen.getByText(/Função do mapper/)).toBeInTheDocument();
    expect(screen.getByText(/1 origem\(ns\) → 1 destino/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver no XML' }));

    expect(useTransformationStore.getState().activeMode).toBe('xml-transformacao');
    expect(useTraceabilityStore.getState().requestedXmlNodeId).toContain('#text');
  });

  it('diferencia candidato sem suporte de candidato compatível sem resultados', () => {
    useTransformationStore.getState().setCandidatesResult(
      [
        {
          candidateId: 'tclxsl-1',
          pathway: 'tcl-xsl',
          transformedXml: '<root />',
          score: null,
          segmentMappings: null,
          validation: null,
          failureReason: null,
          fieldMappings: null,
          sectionMappings: null,
          xmlNamespaces: null,
        },
      ],
      []
    );
    const { rerender } = render(<LinkedFieldInspector />);
    expect(
      screen.getByText('Rastreabilidade por campo indisponível neste candidato.')
    ).toBeVisible();

    useTransformationStore.getState().setCandidatesResult(
      [
        {
          candidateId: 'sysmiddle-1',
          pathway: 'sysmiddle',
          transformedXml: '<root />',
          score: null,
          segmentMappings: null,
          validation: null,
          failureReason: null,
          fieldMappings: [],
          sectionMappings: [],
          xmlNamespaces: null,
        },
      ],
      []
    );
    rerender(<LinkedFieldInspector />);
    expect(
      screen.getByText('O candidato suporta rastreabilidade, mas não encontrou vínculos de campo.')
    ).toBeVisible();
  });

  it('apresenta sectionMappings somente como navegação estrutural', () => {
    useTransformationStore.getState().setCandidatesResult(
      [
        {
          candidateId: 'sysmiddle-section',
          pathway: 'sysmiddle',
          transformedXml:
            '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe><emit /></infNFe></NFe>',
          score: null,
          segmentMappings: null,
          validation: null,
          failureReason: null,
          fieldMappings: null,
          xmlNamespaces: { nfe: 'http://www.portalfiscal.inf.br/nfe' },
          sectionMappings: [
            {
              source: {
                lineGuid: 'line-guid',
                lineName: 'LINHA081',
                lineOccurrence: 7,
              },
              targets: [
                {
                  xPath: '/nfe:NFe/nfe:infNFe/nfe:emit',
                  nodeKind: 'element',
                  xmlOccurrence: 1,
                },
              ],
              confidence: 'authoritative',
            },
          ],
        },
      ],
      []
    );

    render(<LinkedFieldInspector />);

    expect(screen.getByText('Relação por seção')).toBeVisible();
    expect(screen.getByText(/não a posição física exata/)).toBeVisible();
    expect(screen.getByText(/ocorrência estrutural 7/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ver seção no XML' })).toBeEnabled();
  });

  it('usa o Modal como bottom sheet no viewport mobile', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    useTraceabilityStore.getState().setInspectorOpen(true);

    render(<LinkedFieldInspector />);

    expect(screen.getByRole('dialog', { name: 'Inspetor de rastreabilidade' })).toBeVisible();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
