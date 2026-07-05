import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { pantera } from '../../../theme/pantera';

export function BlockContainer({
  label,
  icon,
  subtitle,
  children,
  copyText,
  maxHeight = 420,
  collapsible = false,
  defaultCollapsed = false,
  lineCount,
}: {
  label: string;
  icon?: string;
  subtitle?: string;
  children: ReactNode;
  copyText?: string;
  maxHeight?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  lineCount?: number;
}) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const onCopy = useCallback(async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [copyText]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || collapsed) {
      setOverflows(false);
      return;
    }
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapsed, children, maxHeight]);

  const scrollToEnd = () => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const toggleCollapse = collapsible ? () => setCollapsed((c) => !c) : undefined;

  return (
    <div style={{
      margin: '10px 0',
      border: `1px solid ${pantera.separator}`,
      borderRadius: 8,
      background: pantera.bgLeastVisible,
      overflow: 'hidden',
    }}>
      <div
        onClick={toggleCollapse}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px',
          borderBottom: collapsed ? 'none' : `1px solid ${pantera.separator}`,
          background: pantera.bgBase,
          fontSize: 11,
          cursor: collapsible ? 'pointer' : 'default',
        }}
      >
        {icon && <span style={{ fontSize: 12, lineHeight: 1 }}>{icon}</span>}
        <span style={{ color: pantera.fgMoreSubtle, fontWeight: 500 }}>{label}</span>
        {subtitle && (
          <span style={{
            color: pantera.fgMostSubtle, fontSize: 10,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 280,
          }}>
            {subtitle}
          </span>
        )}
        {lineCount !== undefined && lineCount > 0 && (
          <span style={{ color: pantera.fgMostSubtle, fontSize: 10 }}>
            {lineCount} 行
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {copyText !== undefined && !collapsed && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCopy(); }}
              title="复制"
              style={headerBtn}
            >
              {copied ? '✓' : '⧉'}
            </button>
          )}
          {collapsible && (
            <span style={{ color: pantera.fgMostSubtle, fontSize: 10 }}>
              {collapsed ? '▶' : '▼'}
            </span>
          )}
        </div>
      </div>
      {!collapsed && (
        <div style={{ position: 'relative' }}>
          <div ref={bodyRef} style={{ maxHeight, overflow: 'auto' }}>
            {children}
          </div>
          {overflows && (
            <>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
                background: `linear-gradient(transparent, ${pantera.bgLeastVisible})`,
                pointerEvents: 'none',
              }} />
              <button
                type="button"
                onClick={scrollToEnd}
                title="滚动到底部"
                style={{
                  position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
                  width: 26, height: 26, borderRadius: '50%',
                  border: `1px solid ${pantera.separator}`,
                  background: pantera.bgMostVisible,
                  color: pantera.fgMoreSubtle, cursor: 'pointer', fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ↓
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const headerBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: pantera.fgMostSubtle,
  cursor: 'pointer',
  fontSize: 12,
  padding: '2px 6px',
  borderRadius: 4,
};

export function langIcon(lang: string): string {
  switch (lang) {
    case 'bash':
    case 'sh':
    case 'shell':
    case 'zsh':
      return '⌨';
    case 'json':
      return '{ }';
    case 'go':
      return 'Go';
    case 'typescript':
    case 'ts':
    case 'tsx':
      return 'TS';
    case 'javascript':
    case 'js':
    case 'jsx':
      return 'JS';
    case 'python':
    case 'py':
      return 'Py';
    case 'markdown':
    case 'md':
      return 'Md';
    case 'text':
    case 'txt':
    case 'plaintext':
      return '📄';
    default:
      return '▤';
  }
}

export function normalizeLang(raw: string): string {
  const l = (raw || 'text').toLowerCase();
  if (l === 'sh' || l === 'shell' || l === 'zsh') return 'bash';
  if (l === 'txt' || l === 'plaintext') return 'text';
  if (l === 'md') return 'markdown';
  return l;
}
