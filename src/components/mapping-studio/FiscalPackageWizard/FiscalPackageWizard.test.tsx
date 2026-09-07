import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import {
  MappingPackageRequestError,
  mappingPackageService,
} from '../../../services/api/mappingPackageService';
import FiscalPackageWizard from './FiscalPackageWizard';

vi.mock('../../../services/api/mappingPackageService', async importOriginal => {
  const original =
    await importOriginal<typeof import('../../../services/api/mappingPackageService')>();
  return {
    ...original,
    mappingPackageService: {
      createIdempotencyKey: vi.fn(() => 'idempotency-key-1'),
      createPackage: vi.fn(),
      getPackage: vi.fn(),
      listProjects: vi.fn(),
      createRevision: vi.fn(),
      getExcelInventory: vi.fn(),
    },
  };
});

const createPackageMock = vi.mocked(mappingPackageService.createPackage);
const listProjectsMock = vi.mocked(mappingPackageService.listProjects);
const createRevisionMock = vi.mocked(mappingPackageService.createRevision);
const getExcelInventoryMock = vi.mocked(mappingPackageService.getExcelInventory);

const packageResult = {
  packageId: 'package-1',
  workspaceId: 'workspace-1',
  projectId: 'project-1',
  name: 'FIAT NF-e 4.00',
  createdAt: '2026-09-04T10:00:00Z',
  revisions: [
    {
      revisionId: 'revision-1',
      revisionNumber: 1,
      createdAt: '2026-09-04T10:00:00Z',
      artifacts: [
        {
          artifactId: 'artifact-1',
          kind: 'sample' as const,
          sha256: 'abc123',
          sizeBytes: 2048,
          originalFileName: 'sample.txt',
          inspectionStatus: 'clean' as const,
          uploadedAt: '2026-09-04T10:00:00Z',
        },
        {
          artifactId: 'artifact-2',
          kind: 'spec' as const,
          sha256: 'def456',
          sizeBytes: 4096,
          originalFileName: 'spec.xlsx',
          inspectionStatus: 'clean' as const,
          uploadedAt: '2026-09-04T10:00:00Z',
        },
      ],
    },
  ],
};

const buildFile = (name: string) => new File(['conteudo'], name, { type: 'text/plain' });

const setFileInput = (input: HTMLElement, file: File) => {
  Object.defineProperty(input, 'files', { value: [file] });
  fireEvent.change(input);
};

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/ID do projeto/), {
    target: { value: 'project-1' },
  });
  fireEvent.change(screen.getByLabelText(/Versão do schema/), {
    target: { value: '4.00' },
  });
  fireEvent.change(screen.getByLabelText(/Operação/), {
    target: { value: 'saída' },
  });
  setFileInput(screen.getByLabelText(/Amostra de entrada/), buildFile('sample.txt'));
  setFileInput(screen.getByLabelText(/^Layout/), buildFile('layout.xml'));
  setFileInput(screen.getByLabelText(/Planilha de especificação/), buildFile('spec.xlsx'));
  setFileInput(screen.getByLabelText(/XSD do destino fiscal/), buildFile('destino.xsd'));
};

describe('FiscalPackageWizard', () => {
  beforeEach(() => {
    createPackageMock.mockReset();
    createRevisionMock.mockReset();
    getExcelInventoryMock.mockReset();
    listProjectsMock.mockReset();
    listProjectsMock.mockResolvedValue([]);
    useWorkspaceStore.setState({
      status: 'ready',
      workspaces: [
        {
          workspaceId: 'workspace-1',
          name: 'Workspace fiscal',
          kind: 'organization',
          role: 'mapper',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      activeWorkspaceId: 'workspace-1',
      error: null,
    });
  });

  it('mantém o envio desabilitado até preencher os campos obrigatórios', () => {
    render(
      <MemoryRouter>
        <FiscalPackageWizard />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Enviar pacote fiscal/ })).toBeDisabled();
  });

  it('avisa quando o catálogo de projetos não pode ser carregado', async () => {
    listProjectsMock.mockRejectedValue(
      new MappingPackageRequestError('unavailable', 'Catálogo de projetos indisponível.')
    );

    render(
      <MemoryRouter>
        <FiscalPackageWizard />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Não foi possível carregar o catálogo de projetos/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/ID do projeto/)).toBeInTheDocument();
  });

  it('usa a listagem de projetos para seleção quando disponível', async () => {
    listProjectsMock.mockResolvedValue([
      {
        projectId: 'project-1',
        workspaceId: 'workspace-1',
        name: 'Projeto Fiscal A',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        projectId: 'project-2',
        workspaceId: 'workspace-1',
        name: 'Projeto Fiscal B',
        createdAt: '2026-01-02T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <FiscalPackageWizard />
      </MemoryRouter>
    );

    expect(await screen.findByRole('option', { name: 'Projeto Fiscal A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Projeto Fiscal B' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/ID do projeto \(GUID existente\)/)).not.toBeInTheDocument();
  });

  it('envia o pacote e mostra o resultado da revisão criada', async () => {
    createPackageMock.mockResolvedValue(packageResult);

    render(
      <MemoryRouter>
        <FiscalPackageWizard />
      </MemoryRouter>
    );

    fillRequiredFields();

    const submitButton = screen.getByRole('button', { name: /Enviar pacote fiscal/ });
    expect(submitButton).toBeEnabled();
    fireEvent.submit(submitButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(createPackageMock).toHaveBeenCalledTimes(1));
    expect(createPackageMock.mock.calls[0][0]).toMatchObject({
      workspaceId: 'workspace-1',
      projectId: 'project-1',
    });

    expect(await screen.findByText(/Revisão criada/)).toBeInTheDocument();
    expect(screen.getByText('package-1')).toBeInTheDocument();
  });

  it('mostra a mensagem amigável quando a API recusa o pacote', async () => {
    createPackageMock.mockRejectedValue(
      new MappingPackageRequestError('rejected', 'Artefato de layout inválido.')
    );

    render(
      <MemoryRouter>
        <FiscalPackageWizard />
      </MemoryRouter>
    );

    fillRequiredFields();
    const submitButton = screen.getByRole('button', { name: /Enviar pacote fiscal/ });
    fireEvent.submit(submitButton.closest('form') as HTMLFormElement);

    expect(await screen.findByText('Artefato de layout inválido.')).toBeInTheDocument();
  });

  it('exibe o inventário normalizado da planilha ao consultar um artefato spec', async () => {
    createPackageMock.mockResolvedValue(packageResult);
    getExcelInventoryMock.mockResolvedValue({
      decisionSheets: [{ sheetName: 'Regras', columns: ['Campo', 'Valor'], ruleCount: 12 }],
      skippedSheets: ['Notas'],
    });

    render(
      <MemoryRouter>
        <FiscalPackageWizard />
      </MemoryRouter>
    );

    fillRequiredFields();
    fireEvent.submit(
      screen
        .getByRole('button', { name: /Enviar pacote fiscal/ })
        .closest('form') as HTMLFormElement
    );
    await screen.findByText(/Revisão criada/);

    fireEvent.click(screen.getByRole('button', { name: /Ver inventário da planilha/ }));

    await waitFor(() =>
      expect(getExcelInventoryMock).toHaveBeenCalledWith('workspace-1', 'package-1', 'artifact-2')
    );
    expect(await screen.findByText(/12 regra\(s\) · colunas: Campo, Valor/)).toBeInTheDocument();
    expect(screen.getByText('Notas')).toBeInTheDocument();
  });

  it('cria uma nova revisão a partir do pacote existente', async () => {
    createPackageMock.mockResolvedValue(packageResult);
    const revisedPackage = {
      ...packageResult,
      revisions: [
        ...packageResult.revisions,
        {
          revisionId: 'revision-2',
          revisionNumber: 2,
          createdAt: '2026-09-07T10:00:00Z',
          artifacts: [packageResult.revisions[0].artifacts[0]],
        },
      ],
    };
    createRevisionMock.mockResolvedValue(revisedPackage);

    render(
      <MemoryRouter>
        <FiscalPackageWizard />
      </MemoryRouter>
    );

    fillRequiredFields();
    fireEvent.submit(
      screen
        .getByRole('button', { name: /Enviar pacote fiscal/ })
        .closest('form') as HTMLFormElement
    );
    await screen.findByText(/Revisão criada/);

    fireEvent.click(screen.getByRole('button', { name: /Enviar nova revisão/ }));
    setFileInput(screen.getByLabelText(/Amostra de entrada/), buildFile('sample-v2.txt'));

    fireEvent.submit(
      screen
        .getByRole('button', { name: /Confirmar nova revisão/ })
        .closest('form') as HTMLFormElement
    );

    await waitFor(() => expect(createRevisionMock).toHaveBeenCalledTimes(1));
    expect(createRevisionMock.mock.calls[0][0]).toMatchObject({
      workspaceId: 'workspace-1',
      packageId: 'package-1',
    });
    expect(await screen.findByText('Revisão 2')).toBeInTheDocument();
  });
});
