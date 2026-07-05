import { pantera } from '../../theme/pantera';
import type { Session } from '../../api/client';
import type { UiFocus } from '../state/types';

interface HelpItem { key: string; desc: string }

function buildHelp(
  focus: UiFocus,
  isBusy: boolean,
  queuedCount: number,
  fullHelp: boolean,
): HelpItem[] {
  const items: HelpItem[] = [];
  if (isBusy) {
    items.push({ key: 'esc', desc: queuedCount > 0 ? '清空队列' : '取消' });
  }
  items.push({ key: 'ctrl+tab', desc: focus === 'editor' ? '聚焦聊天' : '聚焦输入' });
  items.push({ key: 'ctrl+p', desc: '命令' });
  items.push({ key: 'ctrl+m', desc: '模型' });
  items.push({ key: 'ctrl+s', desc: '会话' });
  items.push({ key: 'ctrl+n', desc: '新会话' });
  if (focus === 'editor') {
    items.push({ key: 'shift+enter', desc: '换行' });
    items.push({ key: '/', desc: '命令' });
  } else {
    items.push({ key: 'j/k', desc: '滚动' });
    items.push({ key: 'g/G', desc: '顶/底' });
  }
  items.push({ key: 'ctrl+t', desc: '任务' });
  if (fullHelp) {
    items.push({ key: 'ctrl+y', desc: 'yolo' });
    items.push({ key: 'ctrl+g', desc: '收起帮助' });
    items.push({ key: 'ctrl+d', desc: '详情' });
  } else {
    items.push({ key: 'ctrl+g', desc: '更多' });
  }
  return items;
}

export function StatusBar({
  session, sseConnected, focus, isBusy, queuedCount, fullHelp, contextWindow, yolo,
}: {
  session: Session | null;
  sseConnected: boolean;
  focus: UiFocus;
  isBusy: boolean;
  queuedCount: number;
  fullHelp: boolean;
  contextWindow?: number;
  yolo?: boolean;
}) {
  const cost = session?.cost || 0;
  const tokens = (session?.prompt_tokens || 0) + (session?.completion_tokens || 0);
  const window = contextWindow || 128000;
  const usagePercent = Math.min((tokens / window) * 100, 100);
  const help = buildHelp(focus, isBusy, queuedCount, fullHelp);

  return (
    <div style={{
      minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '2px 12px', background: pantera.bgLessVisible,
      borderTop: `1px solid ${pantera.separator}`, fontSize: 10, color: pantera.fgMostSubtle,
      gridArea: 'status', flexWrap: 'wrap', gap: 4,
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>费用 ${cost.toFixed(4)}</span>
        <span>{tokens.toLocaleString()} tok</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 48, height: 4, borderRadius: 2, background: pantera.bgMostVisible, overflow: 'hidden' }}>
            <div style={{
              width: `${usagePercent}%`, height: '100%',
              background: usagePercent > 80 ? pantera.error : usagePercent > 50 ? pantera.warning : pantera.success,
            }} />
          </div>
          <span>{usagePercent.toFixed(0)}%</span>
        </div>
        <span style={{ color: sseConnected ? pantera.success : pantera.fgMostSubtle }}>
          {sseConnected ? '● 已连接' : '○ 未连接'}
        </span>
        {yolo && <span style={{ color: pantera.warning }}>YOLO</span>}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {help.map((h) => (
          <span key={h.key}>
            <span style={{ color: pantera.secondary }}>{h.key}</span> {h.desc}
          </span>
        ))}
      </div>
    </div>
  );
}
