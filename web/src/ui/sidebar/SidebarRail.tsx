import type { CSSProperties, ReactNode } from 'react';
import { pantera } from '../../theme/pantera';
import { workspaceLabel } from '../common/utils';
import type { Workspace } from '../../api/client';

const railBtn: CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: 10,
  background: 'transparent',
  color: pantera.fgMoreSubtle,
  cursor: 'pointer',
  fontSize: 16,
  flexShrink: 0,
};

function RailButton({
  title,
  onClick,
  children,
  active,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        ...railBtn,
        background: active ? pantera.bgMostVisible : 'transparent',
        color: active ? pantera.primary : pantera.fgMoreSubtle,
      }}
    >
      {children}
    </button>
  );
}

export function SidebarRail({
  workspacePath,
  workspaces,
  onExpandSidebar,
  onNewSession,
  onOpenSearch,
  onOpenModelSettings,
  onSelectWorkspace,
}: {
  workspacePath?: string;
  workspaces: Workspace[];
  onExpandSidebar: () => void;
  onNewSession: () => void;
  onOpenSearch: () => void;
  onOpenModelSettings: () => void;
  onSelectWorkspace: (id: string) => void;
}) {
  const wsInitial = workspacePath ? workspaceLabel(workspacePath).slice(0, 1).toUpperCase() : '·';

  return (
    <div style={{
      width: 52,
      borderRight: `1px solid ${pantera.separator}`,
      background: pantera.bgLeastVisible,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px 0',
      gap: 4,
      gridArea: 'sidebar',
      overflow: 'hidden',
    }}>
      <RailButton title="展开侧边栏" onClick={onExpandSidebar}>
        <span style={{ fontWeight: 700, fontSize: 14, color: pantera.primary }}>C</span>
      </RailButton>

      <RailButton title="新建会话" onClick={onNewSession}>
        ✎
      </RailButton>

      <RailButton title="搜索会话 (Ctrl+K)" onClick={onOpenSearch}>
        ⌕
      </RailButton>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        {workspaces.slice(0, 6).map((ws) => (
          <RailButton
            key={ws.id}
            title={workspaceLabel(ws.path)}
            active={ws.path === workspacePath}
            onClick={() => onSelectWorkspace(ws.id)}
          >
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {workspaceLabel(ws.path).slice(0, 1).toUpperCase()}
            </span>
          </RailButton>
        ))}
        {workspaces.length === 0 && (
          <RailButton title={workspacePath || '工作区'} onClick={onExpandSidebar}>
            {wsInitial}
          </RailButton>
        )}
      </div>

      <RailButton title="模型设置" onClick={onOpenModelSettings}>
        ⚙
      </RailButton>
    </div>
  );
}
