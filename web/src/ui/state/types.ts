export type UiState = 'onboarding' | 'initialize' | 'landing' | 'chat';

export type UiFocus = 'editor' | 'chat' | 'none';

export type SidebarMode = 'expanded' | 'rail' | 'hidden';

export type DialogId =
  | 'sessions'
  | 'models'
  | 'commands'
  | 'permissions'
  | 'apiKey'
  | 'oauth'
  | 'filePicker'
  | 'quit'
  | 'search';

export interface PermissionRequest {
  id: string;
  session_id: string;
  tool_call_id: string;
  tool_name: string;
  description: string;
  action: string;
  params?: unknown;
  path?: string;
}

export interface UiStoreState {
  uiState: UiState;
  focus: UiFocus;
  dialogStack: DialogId[];
  sidebarMode: SidebarMode;
  /** Restored when leaving compact viewport. */
  savedSidebarMode: SidebarMode;
  compactMode: boolean;
  detailsOpen: boolean;
  pillsExpanded: boolean;
  pillsSection: 'todos' | 'queue';
  fullHelp: boolean;
  yolo: boolean;
  pendingPermission: PermissionRequest | null;
  toast: string | null;
}

export type UiAction =
  | { type: 'SET_UI_STATE'; uiState: UiState }
  | { type: 'SET_FOCUS'; focus: UiFocus }
  | { type: 'TOGGLE_FOCUS' }
  | { type: 'OPEN_DIALOG'; dialog: DialogId }
  | { type: 'CLOSE_DIALOG' }
  | { type: 'CLOSE_ALL_DIALOGS' }
  | { type: 'SET_SIDEBAR_MODE'; mode: SidebarMode }
  | { type: 'CYCLE_SIDEBAR_MODE' }
  | { type: 'SET_COMPACT'; compact: boolean }
  | { type: 'TOGGLE_DETAILS' }
  | { type: 'TOGGLE_PILLS' }
  | { type: 'SET_PILLS_SECTION'; section: 'todos' | 'queue' }
  | { type: 'TOGGLE_FULL_HELP' }
  | { type: 'SET_YOLO'; yolo: boolean }
  | { type: 'SET_PERMISSION'; permission: PermissionRequest | null }
  | { type: 'SET_TOAST'; message: string | null };

import { loadSidebarMode } from './sidebarMode';

const defaultSidebarMode = typeof window !== 'undefined' ? loadSidebarMode() : 'expanded';

export const initialUiState: UiStoreState = {
  uiState: 'chat',
  focus: 'editor',
  dialogStack: [],
  sidebarMode: defaultSidebarMode,
  savedSidebarMode: defaultSidebarMode,
  compactMode: false,
  detailsOpen: false,
  pillsExpanded: false,
  pillsSection: 'todos',
  fullHelp: false,
  yolo: false,
  pendingPermission: null,
  toast: null,
};
