import { useEffect, useMemo, useState } from 'react';
import { pantera } from '../../theme/pantera';
import { useUi } from '../state/store';

export interface CompletionItem {
  kind: 'file' | 'skill';
  label: string;
  detail?: string;
  value: string;
}

export function CompletionsPopup({
  editorValue,
  files,
  skills,
  onSelect,
}: {
  editorValue: string;
  files: string[];
  skills: Array<{ name: string; description: string }>;
  onSelect: (item: CompletionItem) => void;
}) {
  const { state } = useUi();
  const [index, setIndex] = useState(0);

  const atIdx = editorValue.lastIndexOf('@');
  const open = state.focus === 'editor' && atIdx >= 0;
  const query = open ? editorValue.slice(atIdx + 1) : '';
  const validQuery = open && !query.includes(' ') && !query.includes('\n');

  const items = useMemo(() => {
    if (!validQuery) return [];
    const q = query.toLowerCase();
    const result: CompletionItem[] = [];
    for (const f of files) {
      const base = f.split(/[/\\]/).pop() || f;
      if (f.toLowerCase().includes(q) || base.toLowerCase().includes(q)) {
        result.push({ kind: 'file', label: base, detail: f, value: f });
      }
    }
    for (const s of skills) {
      if (s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) {
        result.push({ kind: 'skill', label: s.name, detail: s.description, value: s.name });
      }
    }
    return result.slice(0, 12);
  }, [files, skills, query, validQuery]);

  useEffect(() => { setIndex(0); }, [query]);

  useEffect(() => {
    if (!open || items.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        onSelect(items[index]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, index, onSelect]);

  if (!validQuery) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)',
      width: 360, maxHeight: 220, overflow: 'auto',
      background: pantera.bgLeastVisible, border: `1px solid ${pantera.separator}`,
      borderRadius: 8, padding: 4, zIndex: 40, boxShadow: '0 8px 24px #0008',
    }}>
      <div style={{ fontSize: 10, color: pantera.fgMostSubtle, padding: '4px 8px' }}>
        @ 补全 · {items.length} 项
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '8px 12px', fontSize: 11, color: pantera.fgMoreSubtle }}>
          无匹配：{query}
        </div>
      ) : items.map((item, i) => (
        <div
          key={`${item.kind}-${item.value}`}
          onClick={() => onSelect(item)}
          style={{
            padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
            background: i === index ? pantera.bgMostVisible : 'transparent',
            display: 'flex', gap: 8, alignItems: 'baseline',
          }}
        >
          <span style={{
            fontSize: 9, color: item.kind === 'skill' ? pantera.success : pantera.secondary,
            fontWeight: 600, textTransform: 'uppercase', flexShrink: 0,
          }}>
            {item.kind === 'skill' ? '技能' : '文件'}
          </span>
          <span style={{ color: pantera.fgBase }}>{item.label}</span>
          {item.detail && item.kind === 'file' && (
            <span style={{ color: pantera.fgMostSubtle, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.detail}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
