const DEFAULT_TITLES = new Set([
  '',
  '新会话',
  'New Session',
  'Untitled Session',
  '无标题',
]);

/** True when the session still has a placeholder title. */
export function isDefaultSessionTitle(title: string | undefined | null): boolean {
  return DEFAULT_TITLES.has((title || '').trim());
}

export function displaySessionTitle(title: string | undefined | null): string {
  if (isDefaultSessionTitle(title)) return '无标题';
  return (title || '').trim() || '无标题';
}

/** Derive a sidebar title from the user's first message. */
export function titleFromFirstMessage(text: string, maxLen = 50): string {
  const line = text.replace(/\s+/g, ' ').trim();
  if (!line) return '新会话';
  if (line.length <= maxLen) return line;
  return `${line.slice(0, maxLen - 1)}…`;
}

/** First non-empty user text part from normalized messages. */
export function firstUserTextFromMessages(
  messages: Array<{ role?: string; content?: Array<{ type?: string; text?: string }> }>,
): string | null {
  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    for (const part of msg.content ?? []) {
      if (part.type === 'text' && part.text?.trim()) {
        return part.text.trim();
      }
    }
  }
  return null;
}
