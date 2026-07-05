import { useRef, useEffect, useCallback } from 'react';
import { pantera } from '../../theme/pantera';
import { randomPlaceholder } from '../common/utils';
import type { Attachment, WorkspaceConfig, Workspace } from '../../api/client';
import { WorkspacePicker } from './WorkspacePicker';
import { ModelMenu } from './ModelMenu';

export function Editor({
  value, onValueChange, onSend, onShell, isBusy, focused, yolo, onOpenCommands, onOpenFilePicker,
  attachments, onAttachmentsChange,
  config, currentProvider, currentModel, onSwitchModel, onOpenModelSettings,
  workspaces, workspaceId, workspacePath, onSwitchWorkspace, onOpenWorkspaceFolder,
  floating,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSend: (text: string, attachments?: Attachment[]) => void;
  onShell: (command: string) => void;
  isBusy: boolean;
  focused?: boolean;
  yolo?: boolean;
  onOpenCommands?: () => void;
  onOpenFilePicker?: () => void;
  attachments?: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  config?: WorkspaceConfig | null;
  currentProvider?: string;
  currentModel?: string;
  onSwitchModel?: (provider: string, model: string) => void;
  onOpenModelSettings?: () => void;
  workspaces?: Workspace[];
  workspaceId?: string;
  workspacePath?: string;
  onSwitchWorkspace?: (id: string) => void;
  onOpenWorkspaceFolder?: (path: string) => void;
  floating?: boolean;
}) {
  const history = useStateHistory();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholder = useRef(randomPlaceholder());
  const pendingAttachments = attachments || [];

  useEffect(() => {
    if (focused) textareaRef.current?.focus();
  }, [focused]);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, []);

  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  const submit = () => {
    const text = value.trim();
    if (!text && pendingAttachments.length === 0) return;
    if (text.startsWith('!')) {
      onShell(text.slice(1).trim());
    } else {
      onSend(text, pendingAttachments.length > 0 ? pendingAttachments : undefined);
      history.push(text);
      history.resetIdx();
      onAttachmentsChange?.([]);
    }
    onValueChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '/' && value === '' && onOpenCommands) {
      e.preventDefault();
      onOpenCommands();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === 'ArrowUp' && value === '') {
      e.preventDefault();
      const prev = history.prev();
      if (prev !== null) onValueChange(prev);
    }
    if (e.key === 'ArrowDown' && history.idx >= 0) {
      e.preventDefault();
      const next = history.next();
      onValueChange(next ?? '');
    }
  };

  const isBang = value.startsWith('!');
  const canSend = value.trim().length > 0 || pendingAttachments.length > 0;
  const inputPlaceholder = isBang
    ? '输入 shell 命令...'
    : isBusy
      ? 'Agent 工作中，消息将加入队列…'
      : placeholder.current;

  return (
    <div style={{
      outline: focused ? `1px solid ${pantera.primary}40` : 'none',
      borderRadius: 12,
    }}>
      <div style={{
        border: `1px solid ${isBang ? pantera.primary : pantera.separator}`,
        borderRadius: 12,
        background: pantera.bgLeastVisible,
        boxShadow: floating ? '0 8px 32px rgba(0,0,0,0.35)' : 'none',
        overflow: 'visible',
      }}>
        {/* Workspace — top */}
        {onSwitchWorkspace && onOpenWorkspaceFolder && (
          <div style={{
            padding: '10px 12px',
            borderBottom: `1px solid ${pantera.separator}40`,
          }}>
            <WorkspacePicker
              workspaces={workspaces || []}
              currentId={workspaceId}
              currentPath={workspacePath}
              onSelect={onSwitchWorkspace}
              onOpenFolder={onOpenWorkspaceFolder}
            />
          </div>
        )}

        {yolo && (
          <div style={{ fontSize: 10, color: pantera.warning, padding: '6px 12px 0' }}>YOLO 模式已开启</div>
        )}

        {pendingAttachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px 0' }}>
            {pendingAttachments.map((a, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 12,
                background: pantera.success + '25', color: pantera.success,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {a.file_name}
                <button
                  type="button"
                  onClick={() => onAttachmentsChange?.(pendingAttachments.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: pantera.fgMostSubtle, cursor: 'pointer', padding: 0 }}
                >×</button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          rows={floating ? 3 : 1}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'transparent', border: 'none', outline: 'none',
            color: pantera.fgBase, fontSize: 14, fontFamily: 'inherit',
            resize: 'none', lineHeight: '22px', minHeight: floating ? 72 : 44,
            maxHeight: 200, padding: '12px 14px',
          }}
        />

        {/* Action bar — model bottom-right */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px 10px', borderTop: `1px solid ${pantera.separator}30`,
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {onOpenFilePicker && !isBang && (
              <button type="button" onClick={onOpenFilePicker} title="添加附件 (Ctrl+F)" style={actionBtn}>
                +
              </button>
            )}
            {onOpenCommands && (
              <button
                type="button"
                onClick={onOpenCommands}
                title="命令 (Ctrl+P)"
                style={{ ...actionBtn, fontSize: 11, width: 'auto', padding: '0 10px' }}
              >
                命令
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onSwitchModel && onOpenModelSettings && (
              <ModelMenu
                config={config || null}
                currentProvider={currentProvider}
                currentModel={currentModel}
                onSwitchModel={onSwitchModel}
                onOpenSettings={onOpenModelSettings}
              />
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              title={isBusy ? '排队发送 (Enter)' : '发送 (Enter)'}
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: canSend ? pantera.primary : pantera.bgMostVisible,
                color: canSend ? pantera.onPrimary : pantera.fgMostSubtle,
                cursor: canSend ? 'pointer' : 'default',
                fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: canSend ? 1 : 0.5,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
      {!floating && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: pantera.fgMostSubtle, padding: '0 4px' }}>
          <span>Enter 发送 · Shift+Enter 换行 · @ 补全</span>
          <span>! 前缀执行 shell</span>
        </div>
      )}
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: `1px solid ${pantera.separator}`,
  background: pantera.bgBase,
  color: pantera.fgMoreSubtle,
  cursor: 'pointer',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function useStateHistory() {
  const ref = useRef({ items: [] as string[], idx: -1 });
  return {
    get idx() { return ref.current.idx; },
    push(text: string) {
      ref.current.items = [...ref.current.items, text];
      ref.current.idx = -1;
    },
    resetIdx() { ref.current.idx = -1; },
    prev(): string | null {
      if (ref.current.items.length === 0) return null;
      const idx = ref.current.idx < 0 ? ref.current.items.length - 1 : Math.max(0, ref.current.idx - 1);
      ref.current.idx = idx;
      return ref.current.items[idx];
    },
    next(): string | null {
      if (ref.current.idx < 0) return null;
      const idx = ref.current.idx + 1;
      if (idx >= ref.current.items.length) {
        ref.current.idx = -1;
        return null;
      }
      ref.current.idx = idx;
      return ref.current.items[idx];
    },
  };
}
