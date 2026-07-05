import { useMemo, useState, useRef, useEffect } from 'react';
import { pantera } from '../../theme/pantera';
import type { WorkspaceConfig } from '../../api/client';

export function ModelMenu({
  config,
  currentProvider,
  currentModel,
  onSwitchModel,
  onOpenSettings,
}: {
  config: WorkspaceConfig | null;
  currentProvider?: string;
  currentModel?: string;
  onSwitchModel: (provider: string, model: string) => void;
  onOpenSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoverProvider, setHoverProvider] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const providers = useMemo(() => {
    const map = config?.providers || {};
    return Object.entries(map)
      .filter(([, p]) => !p.disable)
      .map(([id, p]) => ({
        id,
        name: p.name || id,
        models: (p.models || []).map((m) => ({ id: m.id, name: m.name || m.id })),
      }));
  }, [config]);

  const displayName = useMemo(() => {
    if (!currentProvider || !currentModel) return '模型';
    const p = providers.find((x) => x.id === currentProvider);
    const m = p?.models.find((x) => x.id === currentModel);
    return m?.name || currentModel;
  }, [providers, currentProvider, currentModel]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open && currentProvider) setHoverProvider(currentProvider);
  }, [open, currentProvider]);

  const pick = (providerId: string, modelId: string) => {
    onSwitchModel(providerId, modelId);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 16,
          border: `1px solid ${pantera.separator}`,
          background: pantera.bgBase, color: pantera.fgBase,
          fontSize: 12, cursor: 'pointer', maxWidth: 140,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        <span style={{ color: pantera.fgMostSubtle, fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
          display: 'flex', zIndex: 200,
        }}>
          <div style={{
            minWidth: 160, maxHeight: 280, overflow: 'auto',
            background: pantera.bgLeastVisible, border: `1px solid ${pantera.separator}`,
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            padding: '4px 0',
          }}>
            {providers.map((p) => {
              const active = p.id === currentProvider;
              const hovered = hoverProvider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseEnter={() => setHoverProvider(p.id)}
                  onClick={() => {
                    if (p.models[0]) pick(p.id, p.models[0].id);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer',
                    background: hovered ? pantera.bgMostVisible : 'transparent',
                    color: pantera.fgBase, fontSize: 12, textAlign: 'left',
                  }}
                >
                  <span>{p.name}</span>
                  <span style={{ color: pantera.fgMostSubtle, fontSize: 10 }}>
                    {active && '✓ '}{p.models.length > 0 ? '›' : ''}
                  </span>
                </button>
              );
            })}
            <div style={{ borderTop: `1px solid ${pantera.separator}`, marginTop: 4, paddingTop: 4 }}>
              <button
                type="button"
                onClick={() => { onOpenSettings(); setOpen(false); }}
                style={{
                  width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: pantera.fgMoreSubtle, fontSize: 12, textAlign: 'left',
                }}
              >
                管理模型...
              </button>
            </div>
          </div>

          {hoverProvider && (() => {
            const p = providers.find((x) => x.id === hoverProvider);
            if (!p || p.models.length === 0) return null;
            return (
              <div style={{
                minWidth: 140, maxHeight: 280, overflow: 'auto',
                background: pantera.bgLeastVisible, border: `1px solid ${pantera.separator}`,
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                marginLeft: 4, padding: '4px 0',
              }}>
                {p.models.map((m) => {
                  const active = p.id === currentProvider && m.id === currentModel;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => pick(p.id, m.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer',
                        background: active ? pantera.bgMostVisible : 'transparent',
                        color: active ? pantera.success : pantera.fgBase,
                        fontSize: 12, textAlign: 'left',
                      }}
                    >
                      <span>{m.name}</span>
                      {active && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
