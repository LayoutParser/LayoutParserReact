import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MappingPackageRequestError,
  mappingPackageService,
} from '../../../services/api/mappingPackageService';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import type { FiscalDocumentType, FiscalProfile } from '../../../types/workspace';
import type {
  FiscalMappingPackageDetail,
  MappingPackageArtifactKind,
  MappingPackageArtifactUpload,
} from '../../../types/mappingPackage';
import './FiscalPackageWizard.css';

/** Artefatos obrigatórios para habilitar o envio — `expectedXml` é opcional (gabarito). */
const requiredKinds: MappingPackageArtifactKind[] = ['sample', 'layout', 'spec', 'xsd'];

const artifactLabels: Record<MappingPackageArtifactKind, { label: string; hint: string }> = {
  sample: { label: 'Amostra de entrada', hint: '.txt — MQSeries/IDoc/posicional' },
  layout: { label: 'Layout', hint: '.xml — layout que descreve a amostra' },
  spec: { label: 'Planilha de especificação', hint: '.xlsx — mapeamento campo a campo' },
  xsd: { label: 'XSD do destino fiscal', hint: '.xsd — schema do documento fiscal' },
  expectedXml: { label: 'Gabarito (opcional)', hint: '.xml — XML esperado após transformação' },
  fiscalContext: {
    label: 'Contexto fiscal',
    hint: 'gerado automaticamente a partir dos campos acima',
  },
};

const documentTypeLabels: Record<FiscalDocumentType, string> = {
  nfe: 'NF-e',
  cte: 'CT-e',
  mdfe: 'MDF-e',
  nfse: 'NFS-e',
  nfcom: 'NFCom',
};

const inspectionLabels: Record<string, string> = {
  pending: 'Análise pendente',
  clean: 'Sem achados',
  rejected: 'Rejeitado',
};

type UploadableArtifactKind = Exclude<MappingPackageArtifactKind, 'fiscalContext'>;

const uploadableKinds: UploadableArtifactKind[] = [
  'sample',
  'layout',
  'spec',
  'xsd',
  'expectedXml',
];

const buildFiscalContextFile = (profile: FiscalProfile): File => {
  const payload = JSON.stringify(profile, null, 2);
  return new File([payload], 'fiscal-context.json', { type: 'application/json' });
};

/**
 * Wizard de ingestão do pacote de especificação fiscal (PBI #201).
 *
 * A API hoje só entrega dois endpoints (Slice 2 — issue #229/#236): criar a primeira revisão via
 * upload multipart e consultar o pacote por id. Não existe listagem de projetos, inventário
 * normalizado de Excel/XSD nem criação de nova revisão — por isso o campo de projeto permanece
 * manual (o usuário cola um GUID já existente) e o botão de nova revisão não é oferecido.
 */
const FiscalPackageWizard = () => {
  const { activeWorkspaceId, status } = useWorkspaceStore();
  const [projectId, setProjectId] = useState('');
  const [packageName, setPackageName] = useState('');
  const [documentType, setDocumentType] = useState<FiscalDocumentType>('nfe');
  const [schemaVersion, setSchemaVersion] = useState('');
  const [operation, setOperation] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [files, setFiles] = useState<Partial<Record<UploadableArtifactKind, File>>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FiscalMappingPackageDetail | null>(null);

  const missingRequired = requiredKinds.filter(
    kind => kind !== 'fiscalContext' && !files[kind as UploadableArtifactKind]
  );
  const canSubmit =
    Boolean(activeWorkspaceId) &&
    projectId.trim().length > 0 &&
    schemaVersion.trim().length > 0 &&
    operation.trim().length > 0 &&
    missingRequired.length === 0 &&
    !submitting;

  const handleFileChange = (kind: UploadableArtifactKind, file: File | null) => {
    setFiles(current => {
      const next = { ...current };
      if (file) {
        next[kind] = file;
      } else {
        delete next[kind];
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeWorkspaceId || !canSubmit) return;

    setSubmitting(true);
    setError(null);
    setProgress(0);
    setResult(null);

    const fiscalProfile: FiscalProfile = {
      documentType,
      schemaVersion: schemaVersion.trim(),
      operation: operation.trim(),
      jurisdiction: jurisdiction.trim() || null,
    };

    const artifacts: MappingPackageArtifactUpload[] = uploadableKinds
      .filter(kind => files[kind])
      .map(kind => ({ kind, file: files[kind] as File }));
    artifacts.push({ kind: 'fiscalContext', file: buildFiscalContextFile(fiscalProfile) });

    try {
      const created = await mappingPackageService.createPackage({
        workspaceId: activeWorkspaceId,
        projectId: projectId.trim(),
        name: packageName.trim() || undefined,
        idempotencyKey: mappingPackageService.createIdempotencyKey(),
        artifacts,
        onProgress: setProgress,
      });
      setResult(created);
    } catch (submitError) {
      setError(
        submitError instanceof MappingPackageRequestError
          ? submitError.message
          : 'Não foi possível enviar o pacote fiscal.'
      );
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <main className="fiscal-package-page fiscal-package-page--state" aria-busy="true">
        <span className="mapping-loader" aria-hidden="true" />
        <h1>Preparando o workspace…</h1>
      </main>
    );
  }

  return (
    <main className="fiscal-package-page">
      <nav className="mapping-breadcrumb" aria-label="Navegação">
        <Link to="/workspace">Workspace</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Pacote de especificação fiscal</span>
      </nav>

      <header className="fiscal-package-hero">
        <p className="mapping-kicker">PBI #201</p>
        <h1>Enviar pacote de especificação fiscal</h1>
        <p>
          Monte a primeira revisão com amostra, layout, planilha e XSD. Nenhum conteúdo enviado aqui
          é gravado em <code>localStorage</code>, log ou analytics.
        </p>
      </header>

      <aside className="mapping-boundary-notice" role="note">
        <strong>Catálogo de projetos e nova revisão ainda dependem da API.</strong>
        <span>
          A API só entrega hoje a criação da primeira revisão e a consulta por id (issue #229 / PR
          #236). Não existe endpoint de listagem de projetos, inventário normalizado de Excel/XSD
          nem criação de revisão adicional — por isso o ID do projeto é colado manualmente e esta
          tela não oferece &quot;nova revisão&quot;.
        </span>
      </aside>

      {error && (
        <p className="mapping-page-error" role="alert">
          {error}
        </p>
      )}

      {!result && (
        <form className="fiscal-package-form" onSubmit={event => void handleSubmit(event)}>
          <fieldset>
            <legend>Identificação</legend>
            <label>
              ID do workspace ativo
              <input value={activeWorkspaceId ?? ''} readOnly />
            </label>
            <label>
              ID do projeto (GUID existente)
              <input
                value={projectId}
                onChange={event => setProjectId(event.target.value)}
                placeholder="Cole o GUID do projeto fiscal"
                required
              />
            </label>
            <label>
              Nome do pacote (opcional)
              <input value={packageName} onChange={event => setPackageName(event.target.value)} />
            </label>
          </fieldset>

          <fieldset>
            <legend>Contexto fiscal</legend>
            <label>
              Documento fiscal
              <select
                value={documentType}
                onChange={event => setDocumentType(event.target.value as FiscalDocumentType)}
              >
                {(Object.keys(documentTypeLabels) as FiscalDocumentType[]).map(type => (
                  <option key={type} value={type}>
                    {documentTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Versão do schema
              <input
                value={schemaVersion}
                onChange={event => setSchemaVersion(event.target.value)}
                placeholder="ex.: 4.00"
                required
              />
            </label>
            <label>
              Operação
              <input
                value={operation}
                onChange={event => setOperation(event.target.value)}
                placeholder="ex.: saída, entrada, cancelamento"
                required
              />
            </label>
            <label>
              Jurisdição (opcional)
              <input
                value={jurisdiction}
                onChange={event => setJurisdiction(event.target.value)}
                placeholder="ex.: SP"
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>Artefatos</legend>
            {uploadableKinds.map(kind => (
              <label key={kind}>
                {artifactLabels[kind].label}
                <input
                  type="file"
                  accept={
                    kind === 'sample'
                      ? '.txt'
                      : `.${artifactLabels[kind].hint.split('.')[1]?.split(' ')[0] ?? ''}`
                  }
                  onChange={event => handleFileChange(kind, event.target.files?.[0] ?? null)}
                  required={requiredKinds.includes(kind)}
                />
                <small>{artifactLabels[kind].hint}</small>
              </label>
            ))}
          </fieldset>

          {progress !== null && (
            <p className="mapping-job-status" role="status" aria-live="polite">
              Enviando… {progress}%
            </p>
          )}

          <button
            type="submit"
            className="mapping-button mapping-button--primary"
            disabled={!canSubmit}
          >
            {submitting ? 'Enviando pacote…' : 'Enviar pacote fiscal'}
          </button>
        </form>
      )}

      {result && (
        <section className="fiscal-package-result" aria-labelledby="fiscal-package-result-title">
          <header>
            <p className="mapping-kicker">Revisão criada</p>
            <h2 id="fiscal-package-result-title">{result.name}</h2>
            <p>
              Pacote <code>{result.packageId}</code> · Projeto <code>{result.projectId}</code>
            </p>
          </header>

          {result.revisions.map(revision => (
            <article key={revision.revisionId} className="fiscal-package-revision">
              <h3>Revisão {revision.revisionNumber}</h3>
              <div className="mapping-artifact-list">
                {revision.artifacts.map(artifact => (
                  <article key={artifact.artifactId}>
                    <header>
                      <div>
                        <strong>{artifactLabels[artifact.kind]?.label ?? artifact.kind}</strong>
                        <small>Hash {artifact.sha256}</small>
                      </div>
                      <span
                        className="mapping-status-badge"
                        data-status={artifact.inspectionStatus}
                      >
                        {inspectionLabels[artifact.inspectionStatus] ?? artifact.inspectionStatus}
                      </span>
                    </header>
                    <dl className="mapping-rule-facts">
                      <div>
                        <dt>Arquivo</dt>
                        <dd>{artifact.originalFileName}</dd>
                      </div>
                      <div>
                        <dt>Tamanho</dt>
                        <dd>{(artifact.sizeBytes / 1024).toFixed(1)} KiB</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </article>
          ))}

          <aside className="mapping-limitations">
            <strong>O que esta tela não mostra ainda</strong>
            <ul>
              <li>
                Qualidade/conflito/ausência semântica dos artefatos — a API só devolve hash, tamanho
                e status de inspeção de antivírus por enquanto.
              </li>
              <li>
                Inventário normalizado de abas/cabeçalho/colunas da planilha de especificação.
              </li>
              <li>Criação de uma nova revisão a partir desta.</li>
            </ul>
          </aside>

          <Link to="/workspace" className="mapping-button">
            Voltar ao workspace
          </Link>
        </section>
      )}
    </main>
  );
};

export default FiscalPackageWizard;
