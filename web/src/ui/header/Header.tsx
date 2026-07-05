import { pantera } from '../../theme/pantera';
import type { Session } from '../../api/client';
import { displaySessionTitle } from '../../api/sessionTitle';
import { contextPercent } from '../common/utils';
import type { SidebarMode } from '../state/types';

const MODE_LABELS: Record<SidebarMode, string> = {
  expanded: '展开侧边栏',
  rail: '图标栏',
  hidden: '隐藏侧边栏',
};

const MODE_ICONS: Record<SidebarMode, string> = {
  expanded: '◧',
  rail: '▣',
  hidden: '▶',
};

export function Header({
  session, modelName, compact, cwd, contextUsed, contextWindow, lspErrors,
  onToggleSidebar, sidebarMode, onToggleDetails,
}: {
  session: Session | null;
  modelName: string;
  compact?: boolean;
  cwd?: string;
  contextUsed?: number;
  contextWindow?: number;
  lspErrors?: number;
  onToggleSidebar: () => void;
  sidebarMode: SidebarMode;
  onToggleDetails?: () => void;
}) {
  const pct = contextPercent(contextUsed || 0, contextWindow || 128000);

  return (
    <div style={{
      height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', borderBottom: `1px solid ${pantera.separator}`,
      background: pantera.bgLeastVisible, gridArea: 'header',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        <button onClick={onToggleSidebar} style={{
          background: 'none', border: 'none', color: pantera.fgMoreSubtle,
          cursor: 'pointer', fontSize: 16, padding: '2px 4px',
        }} title={`${MODE_LABELS[sidebarMode]} (Ctrl+B)`}>
          {MODE_ICONS[sidebarMode]}
        </button>
        <span style={{ color: pantera.primary, fontWeight: 700, fontSize: 14 }}>crush</span>
        <span style={{ color: pantera.fgMostSubtle }}>|</span>
        {compact && cwd && (
          <span style={{ color: pantera.fgMostSubtle, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cwd}
          </span>
        )}
        {!compact && (
          <span style={{ color: pantera.fgMoreSubtle, fontSize: 12 }}>
            {session ? displaySessionTitle(session.title) : '新会话（未保存）'}
          </span>
        )}
        {compact && lspErrors !== undefined && lspErrors > 0 && (
          <span style={{ color: pantera.error, fontSize: 11 }}>LSP {lspErrors}</span>
        )}
        {compact && (
          <span style={{ color: pantera.fgMostSubtle, fontSize: 11 }}>~{pct.toFixed(0)}%</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!compact && modelName && (
          <span style={{
            padding: '2px 8px', borderRadius: 12, fontSize: 10,
            background: pantera.bgMostVisible, color: pantera.fgMostSubtle,
          }}>
            {modelName}
          </span>
        )}
        {compact && onToggleDetails && (
          <button onClick={onToggleDetails} style={{
            background: 'none', border: 'none', color: pantera.fgMoreSubtle, cursor: 'pointer', fontSize: 10,
          }}>Ctrl+D 详情</button>
        )}
      </div>
    </div>
  );
}
