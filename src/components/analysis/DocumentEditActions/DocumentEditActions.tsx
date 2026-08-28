import React, { useState } from 'react';

import { ParseRequestError, parseService } from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import { useTransformationStore } from '../../../store/useTransformationStore';
import { createDocumentFile, createEditedDocumentName } from '../../../utils/documentEncoding';
import { layoutMatchesProvenance } from '../../../utils/provenance';
import Button from '../../shared/Button';
import './DocumentEditActions.css';

interface ActionFeedback {
  kind: 'success' | 'error';
  message: string;
}

const DocumentEditActions: React.FC = () => {
  const {
    txtContent,
    selectedLayout,
    documentSource,
    parsedDocumentProvenance,
    editHistory,
    undoLastPositionalEdit,
    replaceParsedDocument,
    setParseError,
  } = useAppStore();
  const { clearCandidates, setDiagnostic, setDiagnosticError } = useTransformationStore();
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  const invalidateTransformation = () => {
    clearCandidates();
    setDiagnostic(null);
    setDiagnosticError(null);
  };

  const handleUndo = () => {
    try {
      const result = undoLastPositionalEdit();
      invalidateTransformation();
      setFeedback({
        kind: 'success',
        message: `Alteração de ${result.field.fieldName} desfeita.`,
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível desfazer a alteração.',
      });
    }
  };

  const handleDownload = () => {
    if (!documentSource) return;

    let url: string | null = null;
    try {
      const file = createDocumentFile(txtContent, documentSource);
      url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = createEditedDocumentName(documentSource.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFeedback({
        kind: 'success',
        message: `Download iniciado em ${documentSource.encoding}, com ${file.size} bytes.`,
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível baixar o documento.',
      });
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  const handleRevalidate = async () => {
    if (!documentSource || !selectedLayout || !parsedDocumentProvenance) return;

    if (!layoutMatchesProvenance(selectedLayout, parsedDocumentProvenance)) {
      setFeedback({
        kind: 'error',
        message:
          'O layout selecionado não é o mesmo que produziu este documento. Processe novamente antes de revalidar.',
      });
      return;
    }

    const layoutContent = selectedLayout.decryptedContent || selectedLayout.valueContent;
    if (!layoutContent) {
      setFeedback({
        kind: 'error',
        message: 'O conteúdo do layout selecionado não está disponível para revalidação.',
      });
      return;
    }

    setIsRevalidating(true);
    setFeedback(null);
    setParseError(null);

    try {
      const txtFile = createDocumentFile(txtContent, documentSource);
      const layoutFile = new File([layoutContent], `${selectedLayout.name || 'layout'}.xml`, {
        type: 'application/xml',
      });
      const result = await parseService.parseFiles({
        layoutFile,
        txtFile,
        layoutName: selectedLayout.name,
      });

      if (typeof result.text !== 'string') {
        throw new Error('A API revalidou o documento, mas não devolveu o TXT processado.');
      }

      replaceParsedDocument(result, documentSource, parsedDocumentProvenance);
      invalidateTransformation();
      const errorCount = result.validationErrors?.length ?? 0;
      setFeedback({
        kind: 'success',
        message:
          errorCount === 0
            ? 'Documento reprocessado e revalidado sem erros posicionais.'
            : `Documento reprocessado. A API devolveu ${errorCount} erro(s) posicional(is) para revisão.`,
      });
    } catch (error) {
      if (error instanceof ParseRequestError) {
        setParseError(error.toInfo());
      }
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível revalidar o documento.',
      });
    } finally {
      setIsRevalidating(false);
    }
  };

  if (!documentSource) return null;

  return (
    <section className="document-edit-actions" aria-label="Ações do TXT editado">
      <div className="document-edit-actions__summary">
        <div>
          <strong>TXT editável</strong>
          <span>
            {documentSource.encoding} · {documentSource.originalSize} bytes
          </span>
        </div>
        <span className="document-edit-actions__history" aria-live="polite">
          {editHistory.length === 0
            ? 'Nenhuma alteração pendente'
            : `${editHistory.length} alteração(ões) nesta sessão`}
        </span>
      </div>

      <div className="document-edit-actions__buttons">
        <Button
          variant="secondary"
          onClick={handleUndo}
          disabled={isRevalidating || editHistory.length === 0}
        >
          Desfazer última alteração
        </Button>
        <Button variant="secondary" onClick={handleDownload} disabled={isRevalidating}>
          Baixar TXT editado
        </Button>
        <Button onClick={() => void handleRevalidate()} disabled={isRevalidating}>
          {isRevalidating ? 'Revalidando…' : 'Reprocessar e revalidar'}
        </Button>
      </div>

      {feedback && (
        <p
          className={`document-edit-actions__feedback document-edit-actions__feedback--${feedback.kind}`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}
    </section>
  );
};

export default DocumentEditActions;
