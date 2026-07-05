import { pantera } from '../../theme/pantera';

function truncate(text: string, max = 80): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function QueueBar({
  queuedCount,
  queuedPrompts,
  isBusy,
  onClearQueue,
}: {
  queuedCount: number;
  queuedPrompts: string[];
  isBusy: boolean;
  onClearQueue: () => void;
}) {
  if (queuedCount <= 0) return null;

  return (
    <div style={{
      marginBottom: 8,
      padding: '8px 10px',
      borderRadius: 10,
      border: `1px solid ${pantera.separator}`,
      background: pantera.bgLeastVisible,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6, gap: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: pantera.fgMoreSubtle }}>
          排队中 ({queuedCount})
        </span>
        <button
          type="button"
          onClick={onClearQueue}
          style={{
            background: 'none', border: 'none', color: pantera.fgMostSubtle,
            fontSize: 11, cursor: 'pointer', padding: '2px 6px',
          }}
        >
          清空队列
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {queuedPrompts.map((prompt, i) => (
          <div
            key={`${i}-${prompt.slice(0, 12)}`}
            style={{
              fontSize: 12, color: pantera.fgBase, padding: '4px 8px',
              borderRadius: 6, background: pantera.bgMostVisible,
              borderLeft: `2px solid ${pantera.busy}`,
            }}
          >
            {truncate(prompt)}
          </div>
        ))}
        {queuedPrompts.length < queuedCount && (
          <div style={{ fontSize: 11, color: pantera.fgMostSubtle, paddingLeft: 8 }}>
            +{queuedCount - queuedPrompts.length} 条更多…
          </div>
        )}
      </div>
      {isBusy && (
        <div style={{ fontSize: 10, color: pantera.fgMostSubtle, marginTop: 6 }}>
          Agent 完成后将自动处理队列 · Esc 清空队列
        </div>
      )}
    </div>
  );
}
