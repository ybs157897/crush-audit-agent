import { useEffect, useCallback } from 'react';
import { useUi } from '../ui/state/store';

export interface KeyboardActions {
  onCancel: () => void;
  onNewSession: () => void;
  onOpenSessions: () => void;
  onOpenModels: () => void;
  onOpenCommands: () => void;
  onOpenSearch?: () => void;
  onTogglePills: () => void;
  onToggleYolo: () => void;
  onOpenFilePicker?: () => void;
}

export function useKeyboard(actions: KeyboardActions, editorValue = '') {
  const { state, dispatch } = useUi();

  const handleKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
    const mod = e.ctrlKey || e.metaKey;

    if (e.key === 'Escape') {
      if (state.dialogStack.length > 0) {
        dispatch({ type: 'CLOSE_DIALOG' });
        e.preventDefault();
        return;
      }
      if (state.detailsOpen) {
        dispatch({ type: 'TOGGLE_DETAILS' });
        e.preventDefault();
        return;
      }
      actions.onCancel();
      e.preventDefault();
      return;
    }

    if (mod && e.key === 'b') { e.preventDefault(); dispatch({ type: 'CYCLE_SIDEBAR_MODE' }); return; }
    if (mod && (e.key === 'k' || e.key === 'K') && actions.onOpenSearch) {
      e.preventDefault();
      actions.onOpenSearch();
      return;
    }
    if (mod && e.key === 's') { e.preventDefault(); actions.onOpenSessions(); return; }
    if (mod && e.key === 'n') { e.preventDefault(); actions.onNewSession(); return; }
    if (mod && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); actions.onOpenCommands(); return; }
    if (mod && (e.key === 'l' || e.key === 'm' || e.key === 'M')) { e.preventDefault(); actions.onOpenModels(); return; }
    if (mod && e.key === 't') { e.preventDefault(); actions.onTogglePills(); return; }
    if (mod && e.key === ' ') { e.preventDefault(); actions.onTogglePills(); return; }
    if (mod && e.key === 'g') { e.preventDefault(); dispatch({ type: 'TOGGLE_FULL_HELP' }); return; }
    if (mod && e.key === 'y') { e.preventDefault(); actions.onToggleYolo(); return; }
    if (mod && (e.key === 'f' || e.key === 'F') && actions.onOpenFilePicker) {
      e.preventDefault();
      actions.onOpenFilePicker();
      return;
    }
    if (mod && e.key === 'd') { e.preventDefault(); dispatch({ type: 'TOGGLE_DETAILS' }); return; }

    if (mod && e.key === 'Tab') {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_FOCUS' });
      return;
    }

    if (!mod && e.key === 'Tab' && !inInput) {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_FOCUS' });
      return;
    }

    if (inInput && editorValue === '' && mod && e.key === 'p') {
      e.preventDefault();
      actions.onOpenCommands();
    }
  }, [state.dialogStack.length, state.detailsOpen, dispatch, actions, editorValue]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
}
