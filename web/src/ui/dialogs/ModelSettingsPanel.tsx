import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pantera } from '../../theme/pantera';
import type { ProviderConfig, ProviderModel } from '../../api/client';
import {
  PROVIDER_TYPES,
  deleteProviderConfig,
  saveProviderConfig,
  updateAgent,
} from '../../api/client';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: pantera.bgLeastVisible,
  border: `1px solid ${pantera.separator}`,
  borderRadius: 4,
  color: pantera.fgBase,
  fontSize: 12,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: pantera.fgMostSubtle,
  marginBottom: 4,
};

function slugId(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base || `provider-${Date.now()}`;
}

function formatTokens(n?: number): string {
  if (!n) return '';
  if (n >= 10000) return `${Math.round(n / 10000)}万`;
  return String(n);
}

function emptyProvider(id?: string): ProviderConfig {
  const pid = id || `custom-${Date.now()}`;
  return {
    id: pid,
    name: '新供应商',
    base_url: '',
    type: 'openai-compat',
    disable: false,
    models: [],
    discover_models: false,
  };
}

export function ModelSettingsPanel({
  workspaceId,
  providers,
  currentModel,
  currentProvider,
  onSaved,
  onSelectModel,
  onSuccess,
  onError,
}: {
  workspaceId: string;
  providers: Record<string, ProviderConfig>;
  currentModel?: string;
  currentProvider?: string;
  onSaved: () => Promise<void>;
  onSelectModel: (provider: string, model: string) => Promise<void>;
  onSuccess?: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const providerIds = useMemo(() => Object.keys(providers), [providers]);
  const [selectedId, setSelectedId] = useState(providerIds[0] || '');
  const [draft, setDraft] = useState<ProviderConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingModelIdx, setEditingModelIdx] = useState<number | null>(null);
  const [newModel, setNewModel] = useState<ProviderModel | null>(null);
  const pendingModelRef = useRef<string | null>(null);

  const loadDraft = useCallback((id: string) => {
    const src = providers[id];
    if (!src) {
      setDraft(emptyProvider(id));
    } else {
      setDraft({
        ...src,
        id: src.id || id,
        models: (src.models || []).map((m) => ({ ...m })),
      });
    }
    setApiKey('');
    setEditingModelIdx(null);
    setNewModel(null);
  }, [providers]);

  useEffect(() => {
    if (selectedId && providers[selectedId]) {
      loadDraft(selectedId);
    } else if (providerIds.length > 0 && !selectedId) {
      setSelectedId(providerIds[0]);
    }
  }, [selectedId, providers, providerIds, loadDraft]);

  const handleAddProvider = () => {
    const p = emptyProvider();
    setSelectedId(p.id);
    setDraft(p);
    setApiKey('');
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      onError('请填写供应商名称');
      return;
    }
    if (!draft.base_url?.trim()) {
      onError('请填写 Base URL');
      return;
    }
    setSaving(true);
    try {
      const id = draft.id || slugId(draft.name);
      const toSave = { ...draft, id };
      await saveProviderConfig(workspaceId, toSave, apiKey || undefined);
      await updateAgent(workspaceId);
      await onSaved();
      const switchModelId = pendingModelRef.current || toSave.models?.[toSave.models.length - 1]?.id;
      pendingModelRef.current = null;
      if (switchModelId) {
        await onSelectModel(toSave.id, switchModelId);
        onSuccess?.(`已启用模型 ${toSave.name}/${switchModelId}`);
      } else {
        onSuccess?.('供应商配置已保存');
      }
      setSelectedId(id);
      setApiKey('');
      loadDraft(id);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft?.id || !window.confirm(`确定删除供应商「${draft.name}」？`)) return;
    setSaving(true);
    try {
      await deleteProviderConfig(workspaceId, draft.id);
      await updateAgent(workspaceId);
      await onSaved();
      const remaining = Object.keys(providers).filter((k) => k !== draft.id);
      setSelectedId(remaining[0] || '');
      if (remaining[0]) loadDraft(remaining[0]);
      else setDraft(null);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (patch: Partial<ProviderConfig>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const saveModel = (idx: number, model: ProviderModel) => {
    if (!draft || !model.id.trim() || !model.name.trim()) return;
    const models = [...(draft.models || [])];
    models[idx] = { ...model, id: model.id.trim(), name: model.name.trim() };
    updateDraft({ models });
    setEditingModelIdx(null);
  };

  const addModel = () => {
    if (!draft || !newModel) return;
    if (!newModel.id.trim() || !newModel.name.trim()) {
      onError('模型 ID 和名称不能为空');
      return;
    }
    const modelId = newModel.id.trim();
    const models = [...(draft.models || []), {
      id: modelId,
      name: newModel.name.trim(),
      context_window: newModel.context_window,
    }];
    pendingModelRef.current = modelId;
    updateDraft({ models });
    setNewModel(null);
  };

  const removeModel = (idx: number) => {
    if (!draft) return;
    const models = (draft.models || []).filter((_, i) => i !== idx);
    updateDraft({ models });
  };

  const hasExistingKey = !!(draft && providers[draft.id]?.api_key);

  return (
    <div style={{ display: 'flex', height: 'min(520px, 60vh)', minHeight: 360 }}>
      {/* Provider list */}
      <div style={{
        width: 200, borderRight: `1px solid ${pantera.separator}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '10px 12px', fontSize: 11, color: pantera.fgMostSubtle }}>
          自定义供应商
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {providerIds.map((pid) => {
            const p = providers[pid];
            const active = pid === selectedId;
            const enabled = !p.disable;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => { setSelectedId(pid); loadDraft(pid); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', textAlign: 'left', padding: '8px 12px',
                  background: active ? pantera.bgMostVisible : 'transparent',
                  border: 'none', cursor: 'pointer', color: pantera.fgMoreSubtle,
                  fontSize: 12,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: enabled ? pantera.success : pantera.fgMostSubtle,
                  flexShrink: 0,
                }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name || pid}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleAddProvider}
          style={{
            margin: 8, padding: '8px 10px', fontSize: 11,
            background: pantera.bgLeastVisible, border: `1px dashed ${pantera.separator}`,
            borderRadius: 4, color: pantera.secondary, cursor: 'pointer',
          }}
        >
          + 添加供应商
        </button>
      </div>

      {/* Provider editor */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {!draft ? (
          <div style={{ color: pantera.fgMostSubtle, fontSize: 12, textAlign: 'center', marginTop: 40 }}>
            点击左侧添加供应商，或选择已有供应商进行配置
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <input
                value={draft.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                style={{ ...inputStyle, width: 'auto', minWidth: 160, fontWeight: 600, fontSize: 14 }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', border: `1px solid ${pantera.separator}` }}>
                  <button
                    type="button"
                    onClick={() => updateDraft({ disable: false })}
                    style={{
                      padding: '4px 12px', fontSize: 11, border: 'none', cursor: 'pointer',
                      background: !draft.disable ? pantera.success : pantera.bgLeastVisible,
                      color: !draft.disable ? pantera.bgBase : pantera.fgMoreSubtle,
                    }}
                  >
                    已启用
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDraft({ disable: true })}
                    style={{
                      padding: '4px 12px', fontSize: 11, border: 'none', cursor: 'pointer',
                      background: draft.disable ? pantera.error : pantera.bgLeastVisible,
                      color: draft.disable ? pantera.bgBase : pantera.fgMoreSubtle,
                    }}
                  >
                    禁用
                  </button>
                </div>
                {providers[draft.id] && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    title="删除供应商"
                    style={{
                      background: 'none', border: 'none', color: pantera.error,
                      cursor: 'pointer', fontSize: 16, padding: 4,
                    }}
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>供应商 ID</label>
              <input
                value={draft.id}
                onChange={(e) => updateDraft({ id: e.target.value })}
                disabled={!!providers[draft.id]}
                placeholder="例如：my-openai"
                style={{ ...inputStyle, opacity: providers[draft.id] ? 0.6 : 1 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Base URL</label>
              <input
                value={draft.base_url || ''}
                onChange={(e) => updateDraft({ base_url: e.target.value })}
                placeholder="https://api.example.com/v1"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>API 格式</label>
              <select
                value={draft.type || 'openai-compat'}
                onChange={(e) => updateDraft({ type: e.target.value })}
                style={inputStyle}
              >
                {PROVIDER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>API Key</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasExistingKey ? '已设置（留空则不修改）' : '输入 API Key'}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  style={{
                    padding: '0 10px', fontSize: 11, cursor: 'pointer',
                    background: pantera.bgLeastVisible, border: `1px solid ${pantera.separator}`,
                    borderRadius: 4, color: pantera.fgMoreSubtle,
                  }}
                >
                  {showKey ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 8, fontSize: 12, color: pantera.fgMoreSubtle, fontWeight: 600 }}>
              模型列表
            </div>
            <div style={{ border: `1px solid ${pantera.separator}`, borderRadius: 4, marginBottom: 12 }}>
              {(draft.models || []).map((m, idx) => {
                const isActive = m.id === currentModel && draft.id === currentProvider;
                const editing = editingModelIdx === idx;
                return (
                  <div
                    key={`${m.id}-${idx}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderBottom: `1px solid ${pantera.separator}`,
                      fontSize: 12,
                    }}
                  >
                    {editing ? (
                      <>
                        <input
                          value={m.id}
                          onChange={(e) => {
                            const models = [...(draft.models || [])];
                            models[idx] = { ...m, id: e.target.value };
                            updateDraft({ models });
                          }}
                          placeholder="模型 ID"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <input
                          value={m.name}
                          onChange={(e) => {
                            const models = [...(draft.models || [])];
                            models[idx] = { ...m, name: e.target.value };
                            updateDraft({ models });
                          }}
                          placeholder="显示名称"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <button type="button" onClick={() => saveModel(idx, m)} style={iconBtn}>✓</button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectModel(draft.id, m.id)}
                          style={{
                            flex: 1, textAlign: 'left', background: 'none', border: 'none',
                            cursor: 'pointer', color: isActive ? pantera.success : pantera.fgBase,
                            padding: 0, fontSize: 12,
                          }}
                        >
                          {m.name}
                          <span style={{ color: pantera.fgMostSubtle, marginLeft: 6 }}>({m.id})</span>
                          {isActive && <span style={{ marginLeft: 6 }}>●</span>}
                        </button>
                        {m.context_window ? (
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 3,
                            background: pantera.bgMostVisible, color: pantera.fgMostSubtle,
                          }}>
                            {formatTokens(m.context_window)}
                          </span>
                        ) : null}
                        <button type="button" onClick={() => setEditingModelIdx(idx)} style={iconBtn}>✎</button>
                        <button type="button" onClick={() => removeModel(idx)} style={iconBtn}>×</button>
                      </>
                    )}
                  </div>
                );
              })}
              {newModel ? (
                <div style={{ display: 'flex', gap: 8, padding: '8px 10px', alignItems: 'center' }}>
                  <input
                    value={newModel.id}
                    onChange={(e) => setNewModel({ ...newModel, id: e.target.value })}
                    placeholder="模型 ID"
                    style={{ ...inputStyle, flex: 1 }}
                    autoFocus
                  />
                  <input
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                    placeholder="显示名称"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="number"
                    value={newModel.context_window || ''}
                    onChange={(e) => setNewModel({
                      ...newModel,
                      context_window: e.target.value ? Number(e.target.value) : undefined,
                    })}
                    placeholder="上下文"
                    style={{ ...inputStyle, width: 80 }}
                  />
                  <button type="button" onClick={addModel} style={iconBtn}>✓</button>
                  <button type="button" onClick={() => setNewModel(null)} style={iconBtn}>×</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setNewModel({ id: '', name: '' })}
                  style={{
                    width: '100%', padding: '8px 10px', fontSize: 11,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: pantera.secondary, textAlign: 'left',
                  }}
                >
                  + 添加模型
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 20px', fontSize: 12, fontWeight: 600,
                  background: pantera.primary, color: pantera.bgBase,
                  border: 'none', borderRadius: 4, cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? '保存中…' : '保存并启用'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: pantera.fgMoreSubtle,
  cursor: 'pointer',
  fontSize: 14,
  padding: '2px 6px',
};
