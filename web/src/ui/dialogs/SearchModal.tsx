import { useEffect, useRef, useState } from 'react';
import { pantera } from '../../theme/pantera';
import type { Session, Workspace } from '../../api/client';
import { DialogOverlay } from './DialogOverlay';
import { useSessionSearch } from '../../hooks/useSessionSearch';
import { displaySessionTitle } from '../../api/sessionTitle';
import { workspaceLabel, formatRelativeTime } from '../common/utils';

export function SearchModal({
  workspaces,
  sessionsByWorkspace,
  currentSessionId,
  onSelect,
  onClose,
}: {
  workspaces: Workspace[];
  sessionsByWorkspace: Record<string, Session[]>;
  currentSessionId?: string;
  onSelect: (workspaceId: string, sessionId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useSessionSearch(workspaces, sessionsByWorkspace, query);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const pick = (workspaceId: string, sessionId: string) => {
    onSelect(workspaceId, sessionId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      const hit = results[selectedIdx];
      pick(hit.workspace.id, hit.session.id);
    }
  };

  return (
    <DialogOverlay title="搜索会话" onClose={onClose} width="min(560px, 92vw)" maxHeight="75vh">
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索会话标题或工作区..."
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${pantera.separator}`, background: pantera.bgLeastVisible,
            color: pantera.fgBase, fontSize: 14, outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {results.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: pantera.fgMostSubtle, fontSize: 13 }}>
              {query.trim() ? '无匹配会话' : '暂无会话'}
            </div>
          ) : (
            results.map((hit, idx) => {
              const active = idx === selectedIdx;
              const isCurrent = hit.session.id === currentSessionId;
              const busy = Boolean(hit.session.is_busy);
              return (
                <button
                  key={`${hit.workspace.id}:${hit.session.id}`}
                  type="button"
                  onClick={() => pick(hit.workspace.id, hit.session.id)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                    border: 'none', marginBottom: 4, cursor: 'pointer',
                    background: active ? pantera.bgMostVisible : 'transparent',
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      color: pantera.fgBase, fontSize: 13, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>
                      {displaySessionTitle(hit.session.title)}
                    </span>
                    {busy && (
                      <span style={{ fontSize: 10, color: pantera.busy }}>运行中</span>
                    )}
                    {isCurrent && (
                      <span style={{ fontSize: 10, color: pantera.primary }}>当前</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, color: pantera.fgMostSubtle }}>
                    <span>{workspaceLabel(hit.workspace.path)}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(hit.session.updated_at)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </DialogOverlay>
  );
}
