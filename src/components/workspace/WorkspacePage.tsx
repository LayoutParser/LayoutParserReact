import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { WorkspaceKind, WorkspaceRole } from '../../types/workspace';
import './WorkspacePage.css';

const roleLabels: Record<WorkspaceRole, string> = {
  owner: 'Proprietário',
  fiscal_admin: 'Administrador fiscal',
  mapper: 'Mapeador',
  reviewer: 'Revisor',
  operator: 'Operador',
  viewer: 'Leitor',
};

const kindLabels: Record<WorkspaceKind, string> = {
  personal: 'Pessoal',
  organization: 'Organização',
};

const WorkspacePage = () => {
  const { status, workspaces, activeWorkspaceId, error, loadWorkspaces } = useWorkspaceStore();
  const activeWorkspace = workspaces.find(workspace => workspace.workspaceId === activeWorkspaceId);

  if (status === 'idle' || status === 'loading') {
    return (
      <main className="workspace-page workspace-page--centered" aria-busy="true" aria-live="polite">
        <section className="workspace-state-card">
          <span className="workspace-state-card__spinner" aria-hidden="true" />
          <p className="workspace-eyebrow">Workspace fiscal</p>
          <h1>Preparando seu ambiente seguro…</h1>
          <p>A identidade autenticada está sendo vinculada ao seu workspace.</p>
        </section>
      </main>
    );
  }

  if (status === 'error' || !activeWorkspace) {
    return (
      <main className="workspace-page workspace-page--centered">
        <section className="workspace-state-card" role="alert">
          <p className="workspace-eyebrow">Workspace indisponível</p>
          <h1>Não foi possível preparar seu ambiente</h1>
          <p>{error || 'A API não informou um workspace ativo válido.'}</p>
          <button type="button" onClick={() => void loadWorkspaces(true)}>
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  const createdAt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(
    new Date(activeWorkspace.createdAt)
  );

  return (
    <main className="workspace-page">
      <section className="workspace-hero" aria-labelledby="workspace-title">
        <div>
          <p className="workspace-eyebrow">Workspace fiscal ativo</p>
          <h1 id="workspace-title">{activeWorkspace.name}</h1>
          <p className="workspace-hero__description">
            Seu ambiente isolado para analisar documentos fiscais, revisar propostas de mapping e
            compreender regras de transformação com segurança.
          </p>
        </div>
        <span className="workspace-role-badge">{roleLabels[activeWorkspace.role]}</span>
      </section>

      <section className="workspace-facts" aria-label="Informações do workspace">
        <article>
          <span>Tipo</span>
          <strong>{kindLabels[activeWorkspace.kind]}</strong>
        </article>
        <article>
          <span>Seu acesso</span>
          <strong>{roleLabels[activeWorkspace.role]}</strong>
        </article>
        <article>
          <span>Criado em</span>
          <strong>{createdAt}</strong>
        </article>
      </section>

      <section className="workspace-section" aria-labelledby="workspace-actions-title">
        <div className="workspace-section__heading">
          <div>
            <p className="workspace-eyebrow">Comece por aqui</p>
            <h2 id="workspace-actions-title">Ferramentas do ambiente</h2>
          </div>
          <p>O processamento atual continua disponível enquanto os próximos contratos evoluem.</p>
        </div>

        <div className="workspace-action-grid">
          <article className="workspace-action-card workspace-action-card--available">
            <span className="workspace-action-card__status">Disponível</span>
            <h3>Processar documento</h3>
            <p>Envie um TXT, MQSeries ou IDoc e inspecione sua estrutura e transformação.</p>
            <Link to="/upload">Abrir processamento</Link>
          </article>

          <article className="workspace-action-card workspace-action-card--available">
            <span className="workspace-action-card__status">Disponível</span>
            <h3>Histórico de análises</h3>
            <p>Consulte as análises fiscais persistidas de um projeto, com paginação por cursor.</p>
            <Link to="/workspace/analyses">Abrir histórico</Link>
          </article>

          <article className="workspace-action-card workspace-action-card--available">
            <span className="workspace-action-card__status">Disponível</span>
            <h3>Mapping Studio</h3>
            <p>
              Revise propostas TCL/XSLT e explique Sysmiddle somente leitura, sem risco de autoria.
            </p>
            <Link to="/workspace/mapping-studio">Abrir Mapping Studio</Link>
          </article>
        </div>
      </section>
    </main>
  );
};

export default WorkspacePage;
