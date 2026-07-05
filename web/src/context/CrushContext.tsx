import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useCrushAPI, type CrushAPI } from '../hooks/useCrushAPI';
import { UiProvider, useUi } from '../ui/state/store';
import type { PermissionRequest } from '../api/client';
import * as api from '../api/client';

const CrushContext = createContext<CrushAPI | null>(null);

function CrushAPIBridge({ children }: { children: ReactNode }) {
  const { dispatch } = useUi();

  const onPermission = useCallback((req: PermissionRequest) => {
    dispatch({ type: 'SET_PERMISSION', permission: req });
    dispatch({ type: 'OPEN_DIALOG', dialog: 'permissions' });
  }, [dispatch]);

  const onToast = useCallback((msg: string) => {
    dispatch({ type: 'SET_TOAST', message: msg });
    setTimeout(() => dispatch({ type: 'SET_TOAST', message: null }), 5000);
  }, [dispatch]);

  const onLifecycle = useCallback((lifecycle: {
    needsOnboarding: boolean;
    needsInit: boolean;
    noSession: boolean;
  }) => {
    if (lifecycle.needsOnboarding) {
      dispatch({ type: 'SET_UI_STATE', uiState: 'onboarding' });
    } else if (lifecycle.needsInit) {
      dispatch({ type: 'SET_UI_STATE', uiState: 'initialize' });
    } else if (lifecycle.noSession) {
      dispatch({ type: 'SET_UI_STATE', uiState: 'landing' });
    } else {
      dispatch({ type: 'SET_UI_STATE', uiState: 'chat' });
    }
  }, [dispatch]);

  const crush = useCrushAPI(onPermission, onToast, onLifecycle);

  return (
    <CrushContext.Provider value={crush}>
      {children}
    </CrushContext.Provider>
  );
}

export function CrushProvider({ children }: { children: ReactNode }) {
  return (
    <UiProvider>
      <CrushAPIBridge>{children}</CrushAPIBridge>
    </UiProvider>
  );
}

export function useCrush(): CrushAPI {
  const ctx = useContext(CrushContext);
  if (!ctx) throw new Error('useCrush must be used within CrushProvider');
  return ctx;
}

export async function grantPermissionAction(
  workspaceId: string,
  permission: PermissionRequest,
  action: 'allow' | 'allow_session' | 'deny',
): Promise<void> {
  await api.grantPermission(workspaceId, permission, action);
}
