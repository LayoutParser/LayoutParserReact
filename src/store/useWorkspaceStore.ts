import { create } from 'zustand';
import { workspaceService } from '../services/api/workspaceService';
import type { FiscalWorkspaceSummary, WorkspaceLoadStatus } from '../types/workspace';

interface WorkspaceState {
  status: WorkspaceLoadStatus;
  workspaces: FiscalWorkspaceSummary[];
  activeWorkspaceId: string | null;
  error: string | null;
  loadWorkspaces: (force?: boolean) => Promise<void>;
  selectWorkspace: (workspaceId: string) => void;
  reset: () => void;
}

const initialWorkspaceState = {
  status: 'idle' as const,
  workspaces: [] as FiscalWorkspaceSummary[],
  activeWorkspaceId: null as string | null,
  error: null as string | null,
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initialWorkspaceState,

  loadWorkspaces: async (force = false) => {
    const currentStatus = get().status;
    if (currentStatus === 'loading' || (!force && currentStatus === 'ready')) {
      return;
    }

    set({ status: 'loading', error: null });
    try {
      const response = await workspaceService.getCurrentWorkspaces();
      set({
        status: 'ready',
        workspaces: response.workspaces,
        activeWorkspaceId: response.activeWorkspaceId,
        error: null,
      });
    } catch (error) {
      set({
        status: 'error',
        workspaces: [],
        activeWorkspaceId: null,
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar seu workspace fiscal.',
      });
    }
  },

  selectWorkspace: workspaceId => {
    if (get().workspaces.some(workspace => workspace.workspaceId === workspaceId)) {
      set({ activeWorkspaceId: workspaceId });
    }
  },

  reset: () => set(initialWorkspaceState),
}));
