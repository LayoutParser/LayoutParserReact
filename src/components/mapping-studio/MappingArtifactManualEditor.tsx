import React, { useState } from 'react';
import {
  MappingReleaseRequestError,
  mappingReleaseService,
} from '../../services/api/mappingReleaseService';
import type { MappingAuthoringEngine } from '../../types/mappingDraft';
import type { MappingRelease, MappingReleaseArtifact } from '../../types/mappingRelease';

interface MappingArtifactManualEditorProps {
  workspaceId: string;
  draftId: string;
  engine: MappingAuthoringEngine;
  artifact: MappingReleaseArtifact;
  /**
   * Hoje a API só verifica membership no workspace, sem gate de papel dedicado à edição manual
   * (confirmado em [[project_fiscal_contract_drift_2026_09_15]]). Esta flag é só otimista — não
   * é uma garantia de segurança; a API continua sendo a autoridade real.
   */
  canEdit: boolean;
  onReleaseCreated: (release: MappingRelease) => void;
}

/**
 * Editor manual de artefato TCL/XSL/XSLT (issue #226). PATCH .../artifacts/{engine} via
 * `mappingReleaseService.editArtifact`, com concorrência otimista por `If-Match`. Sucesso cria
 * uma NOVA release derivada (`artifactSource: 'manual_edit'`) — não sobrescreve a atual.
 */
const MappingArtifactManualEditor = ({
  workspaceId,
  draftId,
  engine,
  artifact,
  canEdit,
  onReleaseCreated,
}: MappingArtifactManualEditorProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(artifact.content);
  const [baseHash, setBaseHash] = useState(artifact.hash);
  const [justification, setJustification] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictArtifact, setConflictArtifact] = useState<MappingReleaseArtifact | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!canEdit) return null;

  const openEditor = () => {
    setContent(artifact.content);
    setBaseHash(artifact.hash);
    setJustification('');
    setError(null);
    setConflictArtifact(null);
    setSuccess(null);
    setOpen(true);
  };

  const reloadWithConflict = () => {
    if (!conflictArtifact) return;
    setContent(conflictArtifact.content);
    setBaseHash(conflictArtifact.hash);
    setConflictArtifact(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim() || !justification.trim()) {
      setError('Conteúdo e justificativa são obrigatórios para editar manualmente.');
      return;
    }
    setBusy(true);
    setError(null);
    setConflictArtifact(null);
    setSuccess(null);
    try {
      const release = await mappingReleaseService.editArtifact({
        workspaceId,
        draftId,
        engine,
        baseArtifactHash: baseHash,
        content,
        justification: justification.trim(),
      });
      onReleaseCreated(release);
      setSuccess(
        `Edição salva: nova release ${release.releaseId} criada a partir desta (derivedFromReleaseId apontará para a release original).`
      );
    } catch (submitError) {
      if (submitError instanceof MappingReleaseRequestError) {
        if (submitError.kind === 'conflict') {
          setError(
            'O artefato mudou em outra sessão desde que você abriu o editor. Recarregue o estado atual antes de tentar novamente.'
          );
          setConflictArtifact(submitError.currentArtifact);
        } else if (submitError.kind === 'precondition') {
          setError(
            'A API exigiu o hash atual do artefato (If-Match); o editor foi reaberto com o hash mais recente conhecido.'
          );
          setBaseHash(artifact.hash);
        } else {
          setError(submitError.message);
        }
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'Não foi possível salvar a edição manual do artefato.'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="mapping-button" onClick={openEditor}>
        Editar manualmente
      </button>
    );
  }

  return (
    <form className="mapping-rule-form" onSubmit={event => void handleSubmit(event)}>
      <h4>Edição manual do artefato {artifact.kind.toUpperCase()}</h4>
      <p>
        A edição gera uma nova release derivada — a release atual não é sobrescrita. Baseado no hash{' '}
        <code>{baseHash}</code>.
      </p>
      <label htmlFor={`manual-edit-content-${artifact.kind}`}>
        Conteúdo do artefato
        <textarea
          id={`manual-edit-content-${artifact.kind}`}
          value={content}
          onChange={event => setContent(event.target.value)}
          rows={16}
          required
          aria-describedby={error ? `manual-edit-error-${artifact.kind}` : undefined}
        />
      </label>
      <label htmlFor={`manual-edit-justification-${artifact.kind}`}>
        Justificativa (obrigatória)
        <textarea
          id={`manual-edit-justification-${artifact.kind}`}
          value={justification}
          onChange={event => setJustification(event.target.value)}
          rows={3}
          required
          aria-describedby={error ? `manual-edit-error-${artifact.kind}` : undefined}
        />
      </label>

      {error && (
        <p id={`manual-edit-error-${artifact.kind}`} className="mapping-inline-error" role="alert">
          {error}
        </p>
      )}
      {conflictArtifact && (
        <div className="mapping-limitations" role="note">
          <strong>Estado atual do artefato na API</strong>
          <pre>
            <code>{conflictArtifact.content}</code>
          </pre>
          <button type="button" className="mapping-button" onClick={reloadWithConflict}>
            Recarregar com este conteúdo
          </button>
        </div>
      )}
      {success && (
        <p className="mapping-job-status" role="status">
          {success}
        </p>
      )}

      <div className="mapping-rule-actions">
        <button type="submit" className="mapping-button mapping-button--primary" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar edição manual'}
        </button>
        <button type="button" className="mapping-button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default MappingArtifactManualEditor;
