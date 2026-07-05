import { createContext, useContext, useReducer, type ReactNode } from 'react';
import {
  initialUiState,
  type SidebarMode,
  type UiAction,
  type UiStoreState,
} from './types';
import { nextSidebarMode, saveSidebarMode } from './sidebarMode';

function uiReducer(state: UiStoreState, action: UiAction): UiStoreState {
  switch (action.type) {
    case 'SET_UI_STATE':
      return { ...state, uiState: action.uiState };
    case 'SET_FOCUS':
      return { ...state, focus: action.focus };
    case 'TOGGLE_FOCUS':
      return { ...state, focus: state.focus === 'editor' ? 'chat' : 'editor' };
    case 'OPEN_DIALOG':
      return { ...state, dialogStack: [...state.dialogStack, action.dialog] };
    case 'CLOSE_DIALOG':
      return { ...state, dialogStack: state.dialogStack.slice(0, -1) };
    case 'CLOSE_ALL_DIALOGS':
      return { ...state, dialogStack: [] };
    case 'SET_SIDEBAR_MODE': {
      if (!state.compactMode) saveSidebarMode(action.mode);
      return {
        ...state,
        sidebarMode: action.mode,
        savedSidebarMode: state.compactMode ? state.savedSidebarMode : action.mode,
      };
    }
    case 'CYCLE_SIDEBAR_MODE': {
      const mode = nextSidebarMode(state.sidebarMode);
      if (!state.compactMode) saveSidebarMode(mode);
      return {
        ...state,
        sidebarMode: mode,
        savedSidebarMode: state.compactMode ? state.savedSidebarMode : mode,
      };
    }
    case 'SET_COMPACT': {
      if (action.compact) {
        return {
          ...state,
          compactMode: true,
          sidebarMode: 'hidden',
        };
      }
      return {
        ...state,
        compactMode: false,
        sidebarMode: state.savedSidebarMode,
      };
    }
    case 'TOGGLE_DETAILS':
      return { ...state, detailsOpen: !state.detailsOpen };
    case 'TOGGLE_PILLS':
      return { ...state, pillsExpanded: !state.pillsExpanded };
    case 'SET_PILLS_SECTION':
      return { ...state, pillsSection: action.section };
    case 'TOGGLE_FULL_HELP':
      return { ...state, fullHelp: !state.fullHelp };
    case 'SET_YOLO':
      return { ...state, yolo: action.yolo };
    case 'SET_PERMISSION':
      return { ...state, pendingPermission: action.permission };
    case 'SET_TOAST':
      return { ...state, toast: action.message };
    default:
      return state;
  }
}

const UiContext = createContext<{
  state: UiStoreState;
  dispatch: React.Dispatch<UiAction>;
} | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialUiState);
  return (
    <UiContext.Provider value={{ state, dispatch }}>
      {children}
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used within UiProvider');
  return ctx;
}

export function sidebarColumnWidth(mode: SidebarMode): string | null {
  if (mode === 'expanded') return '240px';
  if (mode === 'rail') return '52px';
  return null;
}
