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
    },
  };
});

const createPackageMock = vi.mocked(mappingPackageService.createPackage);

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

  it('explica a lacuna de contrato (sem catálogo de projetos)', () => {
    render(
      <MemoryRouter>
        <FiscalPackageWizard />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Catálogo de projetos e nova revisão ainda dependem da API/)
    ).toBeInTheDocument();
  });

  it('mantém o envio desabilitado até preencher os campos obrigatórios', () => {
    render(
      <MemoryRouter>
        <FiscalPackageWizard />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Enviar pacote fiscal/ })).toBeDisabled();
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
});
