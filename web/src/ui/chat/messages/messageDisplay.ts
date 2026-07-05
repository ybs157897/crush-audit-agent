import type { Message, MessageContent } from '../../../api/client';

type ToolResultInfo = { output: string; status: string };

/** Link tool results (role=tool) onto assistant tool_call parts for unified display. */
export function mergeMessagesForDisplay(messages: Message[]): Message[] {
  const resultsByCallId = new Map<string, ToolResultInfo>();

  for (const msg of messages) {
    for (const part of msg.content) {
      if (part.type !== 'tool_result') continue;
      const id = part.tool_call_id;
      if (!id) continue;
      resultsByCallId.set(id, {
        output: part.tool_output || '',
        status: part.status || 'done',
      });
    }
  }

  const merged: Message[] = [];

  for (const msg of messages) {
    if (msg.role === 'tool') continue;

    const content: MessageContent[] = [];

    for (const part of msg.content) {
      if (part.type === 'tool_result') {
        const id = part.tool_call_id;
        if (id && resultsByCallId.has(id)) continue;
      }

      if (part.type === 'tool_call' && part.tool_call_id) {
        const result = resultsByCallId.get(part.tool_call_id);
        if (result) {
          content.push({
            ...part,
            tool_output: result.output,
            status: result.status,
          });
          continue;
        }
      }

      content.push(part);
    }

    merged.push({ ...msg, content });
  }

  return merged;
}
