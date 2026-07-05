import { useState, useEffect } from 'react';
import { pantera } from '../../../theme/pantera';
import { useStreamingReveal } from './StreamingReveal';

type ThinkingMode = 'collapsed' | 'tail' | 'full';
const TAIL_LINES = 200;

function formatThinkingDuration(start?: number, end?: number): string {
  if (!start || !end || end <= start) return '';
  const secs = end - start;
  if (secs < 60) return `${secs} 秒`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m} 分 ${s} 秒` : `${m} 分`;
}

export function ThinkingBlock({
  text,
  finished,
  startedAt,
  finishedAt,
  messageFinished,
  hasResponseText,
}: {
  text: string;
  finished?: boolean;
  startedAt?: number;
  finishedAt?: number;
  messageFinished?: boolean;
  hasResponseText?: boolean;
}) {
  const isActive = !finished
    && !finishedAt
    && !messageFinished
    && !hasResponseText;

  const [mode, setMode] = useState<ThinkingMode>(() => (text.trim() ? 'tail' : 'collapsed'));
  const [userCollapsed, setUserCollapsed] = useState(false);

  const lines = text.split('\n').filter((l, i, arr) => l.length > 0 || i < arr.length - 1);
  const lineCount = lines.length;
  const visibleText = useStreamingReveal(text, isActive && text.length > 0);
  const displaySource = isActive ? visibleText : text;
  const displayLines = displaySource.split('\n').filter((l, i, arr) => l.length > 0 || i < arr.length - 1);
  const display = mode === 'tail'
    ? displayLines.slice(-TAIL_LINES).join('\n')
    : mode === 'full' ? displaySource : '';

  useEffect(() => {
    if (userCollapsed) return;
    if (isActive && lineCount > 0) setMode('tail');
    else if (lineCount > 0 && mode === 'collapsed') setMode('tail');
  }, [isActive, lineCount, userCollapsed, mode]);

  const duration = formatThinkingDuration(startedAt, finishedAt);

  const cycle = () => {
    setMode((m) => {
      const next = m === 'collapsed' ? 'tail' : m === 'tail' ? 'full' : 'collapsed';
      setUserCollapsed(next === 'collapsed');
      return next;
    });
  };

  const label = (() => {
    if (isActive) return lineCount > 0 ? `思考中... (${lineCount} 行)` : '思考中...';
    if (mode === 'tail') return `思考 (${lineCount} 行)`;
    if (mode === 'full') return `思考 (全部 ${lineCount} 行)`;
    if (duration) return `思考完成 · ${duration}`;
    if (lineCount > 0) return `思考 (${lineCount} 行)`;
    return '思考完成';
  })();

  const showBody = mode !== 'collapsed' && (lineCount > 0 || isActive);

  return (
    <div style={{
      margin: '8px 0', border: `1px solid ${pantera.separator}`, borderRadius: 8,
      background: pantera.bgLeastVisible, overflow: 'hidden',
    }}>
      <div
        onClick={cycle}
        style={{
          padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, background: pantera.bgBase,
          borderBottom: showBody ? `1px solid ${pantera.separator}` : 'none',
        }}
      >
        <span style={{ color: isActive ? pantera.busy : pantera.keyword }}>
          {isActive ? '◌' : '◈'}
        </span>
        <span style={{ color: isActive ? pantera.busy : pantera.fgMoreSubtle, fontWeight: 500 }}>
          {label}
        </span>
        {(lineCount > 0 || isActive) && (
          <span style={{ color: pantera.fgMostSubtle, marginLeft: 'auto', fontSize: 10 }}>
            {mode === 'collapsed' ? '▶ 展开' : mode === 'full' ? '▼ 全部' : '▼ 收起'}
          </span>
        )}
      </div>
      {showBody && (
        <div style={{
          padding: '8px 12px', fontSize: 11, color: pantera.fgMoreSubtle,
          whiteSpace: 'pre-wrap', maxHeight: 360, overflow: 'auto', lineHeight: 1.55,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
        >
          {display || (isActive ? '...' : '')}
          {isActive && visibleText.length < text.length && (
            <span style={{ color: pantera.busy }}>▍</span>
          )}
        </div>
      )}
      {mode === 'collapsed' && lineCount > 0 && !isActive && (
        <div style={{
          padding: '6px 12px 8px', fontSize: 10, color: pantera.fgMostSubtle,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          borderTop: `1px solid ${pantera.separator}40`,
        }}
        >
          {lines[lines.length - 1]?.slice(0, 120) || ''}
        </div>
      )}
    </div>
  );
}
