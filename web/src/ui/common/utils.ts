/** Abbreviate home directory paths like the TUI PrettyPath. */
export function prettyPath(path: string): string {
  if (!path) return '';
  return path.replace(/\\/g, '/');
}

/** Last path segment for workspace / folder labels. */
export function workspaceLabel(path: string): string {
  const p = prettyPath(path).replace(/\/$/, '');
  const parts = p.split('/').filter(Boolean);
  return parts[parts.length - 1] || p || 'workspace';
}

/** Relative time like "4天" / "刚刚". */
export function formatRelativeTime(ts: number): string {
  if (!ts) return '';
  const ms = ts > 1e12 ? ts : ts * 1000;
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}天`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}个月`;
  return `${Math.floor(month / 12)}年`;
}

export function contextPercent(used: number, window: number): number {
  if (!window) return 0;
  return Math.min((used / window) * 100, 100);
}

export const EDITOR_PLACEHOLDERS = [
  '向 Crush 提问...',
  '描述你想完成的任务...',
  '输入 ! 前缀执行 shell 命令',
  'Ctrl+P 打开命令面板',
];

export function randomPlaceholder(): string {
  return EDITOR_PLACEHOLDERS[Math.floor(Math.random() * EDITOR_PLACEHOLDERS.length)];
}
