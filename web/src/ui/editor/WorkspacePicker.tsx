import { useMemo, useState, useRef, useEffect } from 'react';
import { pantera } from '../../theme/pantera';
import type { Workspace } from '../../api/client';
import { prettyPath } from '../common/utils';

function folderName(path: string): string {
  const p = path.replace(/[/\\]+$/, '');
  const parts = p.split(/[/\\]/);
  return parts[parts.length - 1] || p || path;
}

export function WorkspacePicker({
  workspaces,
  currentId,
  currentPath,
  onSelect,
  onOpenFolder,
}: {
  workspaces: Workspace[];
  currentId?: string;
  currentPath?: string;
  onSelect: (workspaceId: string) => void;
  onOpenFolder: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) =>
      w.path.toLowerCase().includes(q) || folderName(w.path).toLowerCase().includes(q),
    );
  }, [workspaces, search]);

  const label = currentPath ? folderName(currentPath) : '选择工作区';

  const handleOpenFolder = async () => {
    let picked: string | null = null;
    if (window.crushDesktop?.pickFolder) {
      try {
        picked = await window.crushDesktop.pickFolder();
      } catch {
        /* fall through to prompt */
      }
    }
    if (!picked) {
      const input = window.prompt('输入文件夹路径（绝对路径）', currentPath || '');
      picked = input?.trim() || null;
    }
    if (picked) {
      onOpenFolder(picked);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 16,
          border: `1px solid ${pantera.separator}`,
          background: pantera.bgBase, color: pantera.fgBase,
          fontSize: 12, cursor: 'pointer', maxWidth: '100%',
        }}
      >
        <span style={{ color: pantera.secondary }}>📁</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ color: pantera.fgMostSubtle, fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
          minWidth: 280, maxWidth: 360, maxHeight: 320,
          background: pantera.bgLeastVisible, border: `1px solid ${pantera.separator}`,
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          overflow: 'hidden', zIndex: 200, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: 8, borderBottom: `1px solid ${pantera.separator}` }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索工作区..."
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '6px 10px', fontSize: 12,
                background: pantera.bgBase, border: `1px solid ${pantera.separator}`,
                borderRadius: 6, color: pantera.fgBase,
              }}
            />
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {filtered.map((ws) => {
              const active = ws.id === currentId;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => { onSelect(ws.id); setOpen(false); setSearch(''); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 12px', border: 'none', cursor: 'pointer',
                    background: active ? pantera.bgMostVisible : 'transparent',
                    color: pantera.fgBase, fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>{folderName(ws.path)}</span>
                    {active && <span style={{ color: pantera.success }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 10, color: pantera.fgMostSubtle, marginTop: 2 }}>
                    {prettyPath(ws.path)}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 12, fontSize: 11, color: pantera.fgMostSubtle, textAlign: 'center' }}>
                无匹配工作区
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleOpenFolder}
            style={{
              width: '100%', padding: '10px 12px', border: 'none',
              borderTop: `1px solid ${pantera.separator}`,
              background: pantera.bgBase, color: pantera.fgMoreSubtle,
              fontSize: 12, cursor: 'pointer', textAlign: 'left',
            }}
          >
            📂 打开文件夹...
          </button>
        </div>
      )}
    </div>
  );
}
