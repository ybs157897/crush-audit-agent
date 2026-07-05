import { pantera } from '../../theme/pantera';
import { Logo } from '../common/Logo';
import { workspaceLabel } from '../common/utils';
import type { Workspace } from '../../api/client';

export function LandingView({
  onNewSession,
  workspaces,
  onSelectWorkspace,
  onOpenFolder,
}: {
  onNewSession: () => void;
  workspaces?: Workspace[];
  onSelectWorkspace?: (id: string) => void;
  onOpenFolder?: () => void;
}) {
  const recent = workspaces ?? [];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: pantera.bgBase, gap: 20, padding: 24,
    }}>
      <Logo size="large" />
      <p style={{ fontSize: 14, color: pantera.fgMoreSubtle, maxWidth: 400, textAlign: 'center' }}>
        欢迎使用 Crush Web。打开项目文件夹并创建会话，即可开始与 AI 助手对话。
      </p>

      {recent.length > 0 && onSelectWorkspace && (
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ fontSize: 11, color: pantera.fgMostSubtle, marginBottom: 8, textAlign: 'center' }}>
            最近工作区
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recent.slice(0, 5).map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => onSelectWorkspace(ws.id)}
                style={{
                  padding: '10px 14px', borderRadius: 8, textAlign: 'left',
                  border: `1px solid ${pantera.separator}`, background: pantera.bgLeastVisible,
                  color: pantera.fgBase, fontSize: 13, cursor: 'pointer',
                }}
              >
                {workspaceLabel(ws.path)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onNewSession} style={{
          padding: '10px 24px', background: pantera.primary, color: pantera.onPrimary,
          border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
        }}>新建会话</button>
        {onOpenFolder && (
          <button onClick={onOpenFolder} style={{
            padding: '10px 24px', background: 'transparent', color: pantera.fgMoreSubtle,
            border: `1px solid ${pantera.separator}`, borderRadius: 6, cursor: 'pointer', fontSize: 14,
          }}>打开文件夹</button>
        )}
      </div>
    </div>
  );
}
