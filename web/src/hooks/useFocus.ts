import { useUi } from '../ui/state/store';

export function useFocus() {
  const { state, dispatch } = useUi();
  return {
    focus: state.focus,
    setFocus: (focus: 'editor' | 'chat' | 'none') => dispatch({ type: 'SET_FOCUS', focus }),
    toggleFocus: () => dispatch({ type: 'TOGGLE_FOCUS' }),
    isEditorFocused: state.focus === 'editor',
    isChatFocused: state.focus === 'chat',
  };
}
