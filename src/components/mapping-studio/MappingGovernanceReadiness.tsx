import { useState } from 'react';
import { mappingReleaseService } from '../../services/api/mappingReleaseService';
import type {
  MappingGovernanceEnvironment,
  MappingGovernanceSnapshot,
  MappingRelease,
  MappingReleaseStatus,
} from '../../types/mappingRelease';
import type { WorkspaceRole } from '../../types/workspace';

interface MappingGovernanceReadinessProps {
  workspaceId: string;
  workspaceRole: WorkspaceRole;
  release: MappingRelease;
  onReleaseChange: (release: MappingRelease) => void;
}

type GovernanceAction = 'approve' | 'publish' | 'rollback';

const lifecycle = [
  { id: 'draft', label: 'Draft técnico', description: 'Compilação e gates fiscais' },
  { id: 'in_review', label: 'Em revisão', description: 'Revisão humana auditável' },
  { id: 'approved', label: 'Aprovado', description: 'Pronto para publicação' },
  { id: 'published', label: 'Publicado', description: 'Artefato ativo e imutável' },
  { id: 'deprecated', label: 'Descontinuado', description: 'Substituído ou revertido' },
  { id: 'archived', label: 'Arquivado', description: 'Retido fora de uso' },
] as const;

const lifecycleIndex: Record<MappingReleaseStatus, number> = {
  draft_compiled: 0,
  test_passed: 0,
  test_failed: 0,
  in_review: 1,
  approved: 2,
  published: 3,
  deprecated: 4,
  archived: 5,
};

const statusLabels: Record<MappingReleaseStatus, string> = {
  draft_compiled: 'Aguardando Test Lab',
  test_passed: 'Gates técnicos aprovados',
  test_failed: 'Promoção bloqueada',
  in_review: 'Em revisão',
  approved: 'Aprovada',
  published: 'Publicada',
  deprecated: 'Descontinuada',
  archived: 'Arquivada',
};

const roleLabels: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  fiscal_admin: 'Administrador fiscal',
  mapper: 'Mapeador',
  reviewer: 'Revisor',
  operator: 'Operador',
  viewer: 'Visualizador',
};

const environments: Array<{ value: MappingGovernanceEnvironment; label: string }> = [
  { value: 'development', label: 'Desenvolvimento' },
  { value: 'validation', label: 'Validação' },
  { value: 'production', label: 'Produção' },
];

const canApprove = (role: WorkspaceRole) => ['reviewer', 'fiscal_admin'].includes(role);
const canPublish = (role: WorkspaceRole) => ['fiscal_admin', 'owner'].includes(role);

const mergeGovernanceSnapshot = (
  release: MappingRelease,
  snapshot: MappingGovernanceSnapshot
): MappingRelease => ({ ...release, ...snapshot });

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value)
      )
    : 'Não informado pelo contrato de leitura';

/**
 * Opera apenas as transições autoritativas do Slice 7. O papel vindo de /workspaces/me orienta a
 * interface, mas a API repete o RBAC e permanece responsável por aceitar ou rejeitar a ação.
 */
const MappingGovernanceReadiness = ({
  workspaceId,
  workspaceRole,
  release,
  onReleaseChange,
}: MappingGovernanceReadinessProps) => {
  const [justification, setJustification] = useState('');
  const [environment, setEnvironment] = useState<MappingGovernanceEnvironment>('production');
  const [busyAction, setBusyAction] = useState<GovernanceAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const gatesPassed = release.testRunSummary?.requiredGatesPassed === true;
  const gatesFailed = release.testRunSummary?.requiredGatesPassed === false;
  const readiness = gatesFailed
    ? 'failed'
    : gatesPassed || lifecycleIndex[release.status] > 0
      ? 'ready'
      : 'pending';
  const currentIndex = lifecycleIndex[release.status];
  const approvalAllowed = canApprove(workspaceRole);
  const publicationAllowed = canPublish(workspaceRole);

  const runAction = async (action: GovernanceAction) => {
    setBusyAction(action);
    setError(null);
    setSuccess(null);
    try {
      const snapshot =
        action === 'approve'
          ? await mappingReleaseService.approveRelease(
              workspaceId,
              release.releaseId,
              justification
            )
          : action === 'publish'
            ? await mappingReleaseService.publishRelease(
                workspaceId,
                release.releaseId,
                environment
              )
            : await mappingReleaseService.rollbackRelease(workspaceId, release.releaseId);
      onReleaseChange(mergeGovernanceSnapshot(release, snapshot));
      if (action === 'approve') setJustification('');
      setSuccess(
        action === 'approve'
          ? 'Release aprovada e registrada na trilha de auditoria.'
          : action === 'publish'
            ? `Release publicada em ${environment}.`
            : snapshot.status === 'deprecated'
              ? 'Rollback concluído; esta release foi descontinuada.'
              : 'Rollback já havia sido processado; nenhuma nova transição foi criada.'
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Não foi possível concluir a transição de governança.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className="mapping-governance" aria-labelledby="mapping-governance-title">
      <header>
        <div>
          <p className="mapping-kicker">Slice 7 · governança fiscal</p>
          <h3 id="mapping-governance-title">Revisão, publicação e rollback</h3>
        </div>
        <span className="mapping-status-badge" data-readiness={readiness}>
          {statusLabels[release.status]}
        </span>
      </header>

      <ol className="mapping-lifecycle" aria-label="Ciclo de vida da release fiscal">
        {lifecycle.map((stage, index) => {
          const state =
            index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'locked';
          return (
            <li
              key={stage.id}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span aria-hidden="true">{state === 'completed' ? '✓' : index + 1}</span>
              <div>
                <strong>{stage.label}</strong>
                <small>{stage.description}</small>
              </div>
            </li>
          );
        })}
      </ol>

      <aside className="mapping-governance__notice" data-readiness={readiness} role="note">
        {release.status === 'test_failed' ? (
          <>
            <strong>Os gates obrigatórios reprovaram.</strong>
            <span>Corrija o Draft, gere uma nova release e execute novamente a regressão.</span>
          </>
        ) : release.status === 'draft_compiled' ? (
          <>
            <strong>Execute o Fiscal Test Lab antes da governança.</strong>
            <span>Nenhuma versão pode avançar sem evidência de XSD, diff e cobertura.</span>
          </>
        ) : (
          <>
            <strong>{statusLabels[release.status]}.</strong>
            <span>
              As transições são registradas pela API com o ator e o instante da operação; nenhuma
              promoção é automática.
            </span>
          </>
        )}
      </aside>

      {(release.approvedAt || release.publishedAt || release.environment) && (
        <dl className="mapping-rule-facts mapping-governance__facts">
          <div>
            <dt>Ambiente ativo</dt>
            <dd>{release.environment ?? 'Não informado'}</dd>
          </div>
          <div>
            <dt>Aprovada em</dt>
            <dd>{formatDate(release.approvedAt)}</dd>
          </div>
          <div>
            <dt>Publicada em</dt>
            <dd>{formatDate(release.publishedAt)}</dd>
          </div>
          <div>
            <dt>Release anterior</dt>
            <dd>{release.previousPublishedReleaseId ?? 'Nenhuma informada'}</dd>
          </div>
        </dl>
      )}

      {release.status === 'test_passed' &&
        (approvalAllowed ? (
          <form
            className="mapping-governance__actions"
            onSubmit={event => {
              event.preventDefault();
              void runAction('approve');
            }}
          >
            <h4>Aprovar para publicação</h4>
            <label>
              Justificativa da revisão
              <textarea
                value={justification}
                onChange={event => setJustification(event.target.value)}
                rows={3}
                required
              />
            </label>
            <button
              type="submit"
              className="mapping-button mapping-button--primary"
              disabled={busyAction !== null || !justification.trim()}
            >
              {busyAction === 'approve' ? 'Aprovando…' : 'Aprovar release'}
            </button>
          </form>
        ) : (
          <p className="mapping-governance__permission" role="note">
            Seu papel atual ({roleLabels[workspaceRole]}) não aprova releases. A API exige Revisor
            ou Administrador fiscal.
          </p>
        ))}

      {release.status === 'approved' &&
        (publicationAllowed ? (
          <form
            className="mapping-governance__actions"
            onSubmit={event => {
              event.preventDefault();
              void runAction('publish');
            }}
          >
            <h4>Publicar release imutável</h4>
            <label>
              Ambiente de ativação
              <select
                value={environment}
                onChange={event =>
                  setEnvironment(event.target.value as MappingGovernanceEnvironment)
                }
              >
                {environments.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <p>Publicar congela os artefatos. Qualquer alteração exige uma nova release testada.</p>
            <button
              type="submit"
              className="mapping-button mapping-button--primary"
              disabled={busyAction !== null}
            >
              {busyAction === 'publish' ? 'Publicando…' : 'Publicar release'}
            </button>
          </form>
        ) : (
          <p className="mapping-governance__permission" role="note">
            Seu papel atual ({roleLabels[workspaceRole]}) não publica releases. A API exige Owner ou
            Administrador fiscal.
          </p>
        ))}

      {release.status === 'published' &&
        (publicationAllowed ? (
          <div className="mapping-governance__actions mapping-governance__actions--danger">
            <h4>Rollback da publicação</h4>
            <p>
              A API descontinua esta release e restaura a publicação anterior. Se não houver versão
              anterior, a operação será recusada sem alterar os artefatos.
            </p>
            <button
              type="button"
              className="mapping-button mapping-button--danger"
              disabled={busyAction !== null}
              onClick={() => void runAction('rollback')}
            >
              {busyAction === 'rollback' ? 'Revertendo…' : 'Reverter para a versão anterior'}
            </button>
          </div>
        ) : (
          <p className="mapping-governance__permission" role="note">
            Seu papel atual ({roleLabels[workspaceRole]}) não executa rollback. A API exige Owner ou
            Administrador fiscal.
          </p>
        ))}

      {error && (
        <p className="mapping-page-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mapping-job-status" role="status">
          {success}
        </p>
      )}
    </section>
  );
};

export default MappingGovernanceReadiness;
