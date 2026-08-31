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
            Seu ambiente isolado para analisar documentos fiscais e, nos próximos slices, organizar
            históricos, pacotes e mappings versionados.
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

          <article className="workspace-action-card">
            <span className="workspace-action-card__status">Próximo slice</span>
            <h3>Histórico de análises</h3>
            <p>As análises persistidas aparecerão aqui após o contrato de projetos e retenção.</p>
          </article>

          <article className="workspace-action-card">
            <span className="workspace-action-card__status">Planejado</span>
            <h3>Mapping Studio</h3>
            <p>Revisão assistida e autoria de TCL/XSL/XSLT, com Sysmiddle somente leitura.</p>
          </article>
        </div>
      </section>
    </main>
  );
};

export default WorkspacePage;
