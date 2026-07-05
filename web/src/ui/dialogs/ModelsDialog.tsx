import { useState } from 'react';
import { pantera } from '../../theme/pantera';
import type { WorkspaceConfig } from '../../api/client';
import { DialogOverlay } from './DialogOverlay';
import { ModelSettingsPanel } from './ModelSettingsPanel';

type Tab = 'switch' | 'settings';

export function ModelsDialog({
  workspaceId,
  config,
  currentModel,
  currentProvider,
  onSelect,
  onRefresh,
  onClose,
  onError,
  onSuccess,
  initialTab = 'switch',
}: {
  workspaceId: string;
  config: WorkspaceConfig | null;
  currentModel?: string;
  currentProvider?: string;
  onSelect: (provider: string, model: string) => void | Promise<void>;
  onRefresh: () => Promise<void>;
  onClose: () => void;
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [filter, setFilter] = useState('');
  const providers = config?.providers || {};

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    background: 'none',
    border: 'none',
    borderBottom: active ? `2px solid ${pantera.primary}` : '2px solid transparent',
    color: active ? pantera.fgBase : pantera.fgMoreSubtle,
    cursor: 'pointer',
  });

  return (
    <DialogOverlay
      title="模型"
      onClose={onClose}
      width={tab === 'settings' ? 'min(920px, 95vw)' : 'min(520px, 90vw)'}
      maxHeight={tab === 'settings' ? '85vh' : '70vh'}
    >
      <div style={{ borderBottom: `1px solid ${pantera.separator}`, display: 'flex' }}>
        <button type="button" onClick={() => setTab('switch')} style={tabStyle(tab === 'switch')}>
          切换模型
        </button>
        <button type="button" onClick={() => setTab('settings')} style={tabStyle(tab === 'settings')}>
          模型设置
        </button>
      </div>

      {tab === 'switch' && (
        <div style={{ padding: 12 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="搜索模型..."
            autoFocus
            style={{
              width: '100%', padding: '8px 10px', marginBottom: 8,
              background: pantera.bgLeastVisible, border: `1px solid ${pantera.separator}`,
              borderRadius: 4, color: pantera.fgBase, fontSize: 12,
            }}
          />
          <div style={{ fontSize: 11, color: pantera.fgMostSubtle, marginBottom: 8 }}>
            当前：{currentProvider}/{currentModel}
          </div>
          {Object.entries(providers).map(([pid, p]) => {
            if (p.disable) return null;
            const models = (p.models || []).filter((m) =>
              m.name.toLowerCase().includes(filter.toLowerCase()) ||
              m.id.toLowerCase().includes(filter.toLowerCase()),
            );
            if (models.length === 0) return null;
            return (
              <div key={pid} style={{ marginBottom: 12 }}>
                <div style={{ color: pantera.secondary, fontSize: 12, marginBottom: 4 }}>{p.name || pid}</div>
                {models.map((m) => {
                  const active = m.id === currentModel && pid === currentProvider;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={async () => { await onSelect(pid, m.id); onClose(); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '6px 10px', fontSize: 11, color: pantera.fgMoreSubtle,
                        background: active ? pantera.bgMostVisible : 'transparent',
                        border: 'none', borderRadius: 4, cursor: 'pointer',
                      }}
                    >
                      {m.name} <span style={{ color: pantera.fgMostSubtle }}>({m.id})</span>
                      {active && <span style={{ color: pantera.success, marginLeft: 8 }}>●</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {Object.keys(providers).length === 0 && (
            <div style={{ color: pantera.fgMostSubtle, fontSize: 12, textAlign: 'center', padding: 20 }}>
              暂无可用模型，请前往「模型设置」添加供应商
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <ModelSettingsPanel
          workspaceId={workspaceId}
          providers={providers}
          currentModel={currentModel}
          currentProvider={currentProvider}
          onSaved={onRefresh}
          onSelectModel={async (provider, model) => {
            await onSelect(provider, model);
          }}
          onSuccess={onSuccess}
          onError={(msg) => onError?.(msg)}
        />
      )}
    </DialogOverlay>
  );
}
