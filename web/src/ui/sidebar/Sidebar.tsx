import { useState } from 'react';
import { pantera } from '../../theme/pantera';
import type { Session, AgentInfo, Workspace } from '../../api/client';
import type { SessionRuntimeStatus } from '../../hooks/useCrushAPI';
import { Section } from '../common/Section';
import { contextPercent, workspaceLabel, formatRelativeTime } from '../common/utils';
import { normalizeWorkspacePath } from '../../api/workspaceRegistry';
import { displaySessionTitle } from '../../api/sessionTitle';

function SessionStatusDot({
  running,
  done,
  active,
}: {
  running: boolean;
  done: boolean;
  active: boolean;
}) {
  if (running) {
    return (
      <span
        title="运行中"
        style={{
          width: 14, height: 14, flexShrink: 0, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
          animation: 'crush-spin 0.9s linear infinite',
          color: pantera.busy, fontSize: 11,
        }}
      >
        ◌
      </span>
    );
  }
  if (done) {
    return (
      <span
        title="已完成"
        style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: pantera.success, marginTop: 5,
        }}
      />
    );
  }
  return (
    <span style={{
      color: active ? pantera.primary : pantera.fgMostSubtle,
      fontSize: 8, lineHeight: '18px', flexShrink: 0,
    }}>
      {active ? '●' : '○'}
    </span>
  );
}

export function Sidebar({
  workspaces,
  workspaceId,
  session,
  sessionsByWorkspace,
  sessionStatus,
  agentInfo,
  onOpenModelSettings,
  onNewSession,
  onSelectSession,
  onSelectWorkspace,
  onDeleteSession,
  onRenameSession,
  onOpenSearch,
  compact,
}: {
  workspaces: Workspace[];
  workspaceId: string | null;
  session: Session | null;
  sessionsByWorkspace: Record<string, Session[]>;
  sessionStatus: Record<string, SessionRuntimeStatus>;
  agentInfo: AgentInfo | null;
  onOpenModelSettings: () => void;
  onNewSession?: () => void;
  onSelectSession: (workspaceId: string, sessionId: string) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onDeleteSession?: (workspaceId: string, sessionId: string, title: string) => void;
  onRenameSession?: (workspaceId: string, sessionId: string, title: string) => void;
  onOpenSearch?: () => void;
  compact?: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const tokens = (session?.prompt_tokens || 0) + (session?.completion_tokens || 0);
  const ctxWindow = agentInfo?.model?.context_window || 128000;
  const pct = contextPercent(tokens, ctxWindow);
  const currentId = session?.id;

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isRunning = (s: Session) =>
    sessionStatus[s.id] === 'running' || Boolean(s.is_busy);
  const isDone = (s: Session) =>
    sessionStatus[s.id] === 'done' && !isRunning(s);

  const startRename = (wsId: string, s: Session) => {
    setEditingId(`${wsId}:${s.id}`);
    setEditTitle(s.title || '');
  };

  const commitRename = (wsId: string, sessionId: string) => {
    const trimmed = editTitle.trim();
    if (trimmed && onRenameSession) {
      onRenameSession(wsId, sessionId, trimmed);
    }
    setEditingId(null);
  };

  return (
    <div style={{
      width: compact ? '100%' : 240,
      borderRight: compact ? 'none' : `1px solid ${pantera.separator}`,
      background: pantera.bgLeastVisible, overflow: 'auto',
      display: 'flex', flexDirection: 'column', padding: '12px 10px',
      gridArea: 'sidebar',
    }}>
      <style>{`
        @keyframes crush-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <button
        type="button"
        onClick={onNewSession}
        style={{
          width: '100%', padding: '8px 12px', marginBottom: 8,
          background: pantera.bgMostVisible, border: `1px solid ${pantera.separator}`,
          borderRadius: 8, color: pantera.fgBase, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        + 新建会话
      </button>

      {onOpenSearch && (
        <button
          type="button"
          onClick={onOpenSearch}
          style={{
            width: '100%', padding: '8px 12px', marginBottom: 12,
            background: 'transparent', border: `1px solid ${pantera.separator}`,
            borderRadius: 8, color: pantera.fgMoreSubtle, fontSize: 12,
            cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 8, alignItems: 'center',
          }}
        >
          <span>⌕</span>
          <span>搜索会话</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: pantera.fgMostSubtle }}>Ctrl+K</span>
        </button>
      )}

      <Section title="工作区">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {workspaces.length === 0 && (
            <div style={{ fontSize: 11, color: pantera.fgMostSubtle, padding: '4px 6px' }}>
              暂无工作区
            </div>
          )}
          {workspaces.map((ws) => {
            const wsActive = ws.id === workspaceId;
            const wsSessions = sessionsByWorkspace[normalizeWorkspacePath(ws.path)] ?? [];
            const isCollapsed = collapsed[ws.id] ?? !wsActive;
            const label = workspaceLabel(ws.path);
            const wsBusy = wsSessions.some((s) => isRunning(s));

            return (
              <div key={ws.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!wsActive) onSelectWorkspace(ws.id);
                    toggleCollapse(ws.id);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    width: '100%', textAlign: 'left', padding: '6px 8px',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                    background: wsActive ? pantera.bgMostVisible : 'transparent',
                    color: wsActive ? pantera.fgBase : pantera.fgMoreSubtle,
                    fontSize: 12, fontWeight: wsActive ? 600 : 500,
                  }}
                >
                  <span style={{ fontSize: 10, color: pantera.fgMostSubtle }}>
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                  <span style={{ fontSize: 12 }}>📁</span>
                  <span style={{
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 10, color: pantera.fgMostSubtle }}>{wsSessions.length}</span>
                  {wsBusy && (
                    <span style={{
                      animation: 'crush-spin 0.9s linear infinite',
                      color: pantera.busy, fontSize: 10,
                    }}>
                      ◌
                    </span>
                  )}
                </button>

                {!isCollapsed && (
                  <div style={{ paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {wsSessions.length === 0 && (
                      <div style={{ fontSize: 10, color: pantera.fgMostSubtle, padding: '4px 8px' }}>
                        暂无会话
                      </div>
                    )}
                    {wsSessions.map((s) => {
                      const active = s.id === currentId && wsActive;
                      const running = isRunning(s);
                      const done = isDone(s);
                      const editKey = `${ws.id}:${s.id}`;
                      const isEditing = editingId === editKey;
                      const showDelete = hoveredId === s.id && onDeleteSession && !isEditing;
                      return (
                        <div
                          key={s.id}
                          style={{ display: 'flex', alignItems: 'stretch', gap: 2 }}
                          onMouseEnter={() => setHoveredId(s.id)}
                          onMouseLeave={() => setHoveredId((id) => (id === s.id ? null : id))}
                        >
                          <button
                            type="button"
                            onClick={() => !isEditing && onSelectSession(ws.id, s.id)}
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              if (onRenameSession) startRename(ws.id, s);
                            }}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 8,
                              flex: 1, textAlign: 'left', padding: '6px 8px',
                              border: 'none', borderRadius: 6, cursor: 'pointer',
                              background: active ? pantera.bgMostVisible : 'transparent',
                              color: active ? pantera.fgBase : pantera.fgMoreSubtle,
                              fontSize: 11,
                            }}
                          >
                            <SessionStatusDot running={running} done={done} active={active} />
                            {isEditing ? (
                              <input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitRename(ws.id, s.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                onBlur={() => commitRename(ws.id, s.id)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                style={{
                                  flex: 1, padding: '2px 4px', fontSize: 11,
                                  background: pantera.bgBase, border: `1px solid ${pantera.primary}`,
                                  borderRadius: 4, color: pantera.fgBase,
                                }}
                              />
                            ) : (
                              <span style={{
                                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', fontWeight: active ? 600 : 400,
                              }}>
                                {displaySessionTitle(s.title)}
                              </span>
                            )}
                            {!isEditing && (
                              <span style={{
                                fontSize: 9, color: pantera.fgMostSubtle, flexShrink: 0, marginTop: 2,
                              }}>
                                {formatRelativeTime(s.updated_at)}
                              </span>
                            )}
                          </button>
                          {showDelete && (
                            <button
                              type="button"
                              title="删除会话"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(ws.id, s.id, s.title || '');
                              }}
                              style={{
                                flexShrink: 0, width: 28, margin: '2px 0',
                                border: 'none', borderRadius: 6, cursor: 'pointer',
                                background: 'transparent', color: pantera.error,
                                fontSize: 12, opacity: 0.85,
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="上下文">
        <div style={{ color: pantera.fgMostSubtle, fontSize: 11 }}>
          {tokens.toLocaleString()} / {ctxWindow.toLocaleString()} tok (~{pct.toFixed(0)}%)
        </div>
        {session && session.cost > 0 && (
          <div style={{ color: pantera.fgMostSubtle, fontSize: 11, marginTop: 4 }}>
            费用 ${session.cost.toFixed(4)}
          </div>
        )}
      </Section>

      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <button
          type="button"
          onClick={onOpenModelSettings}
          title="模型设置"
          style={{
            width: '100%', padding: '8px 10px', fontSize: 11,
            background: pantera.bgLeastVisible, border: `1px solid ${pantera.separator}`,
            borderRadius: 8, color: pantera.fgMoreSubtle, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span>⚙</span>
          <span>模型设置</span>
        </button>
      </div>
    </div>
  );
}
