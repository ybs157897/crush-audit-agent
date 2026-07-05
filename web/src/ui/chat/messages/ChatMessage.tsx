import { pantera } from '../../../theme/pantera';
import type { Message } from '../../../api/client';
import { ThinkingBlock } from './ThinkingBlock';
import { BashToolView, ToolCallView, ShellMessageView } from './ToolViews';
import { FileToolView, SearchToolView } from './FileTool';
import { MarkdownContent } from './MarkdownContent';
import { StreamingPlainText } from './StreamingReveal';

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const streaming = !message.finished && message.role === 'assistant';
  const hasResponseText = message.content?.some((c) => c.type === 'text' && (c.text || '').trim());

  return (
    <div style={{
      padding: '16px 4px',
      borderBottom: `1px solid ${pantera.separator}20`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, flexShrink: 0,
          background: isUser ? pantera.accent : pantera.primary,
          color: isUser ? pantera.bgBase : pantera.onPrimary,
        }}>
          {isUser ? 'U' : 'A'}
        </span>
        <span style={{ fontSize: 11, color: pantera.fgMostSubtle }}>
          {isUser ? '你' : '助手'}
        </span>
      </div>

      <div style={{
        paddingLeft: 30,
        maxWidth: '100%',
      }}>
        {message.content?.map((c, i) => {
          if (c.type === 'text') {
            const text = c.text || '';
            if (!text.trim()) return null;
            if (isUser) {
              return (
                <div
                  key={i}
                  style={{
                    marginBottom: 8, padding: '10px 14px',
                    background: pantera.bgMostVisible,
                    borderRadius: 10,
                    border: `1px solid ${pantera.separator}`,
                    color: pantera.fgBase, fontSize: 14, lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {text}
                </div>
              );
            }
            return (
              <div key={i} style={{ marginBottom: 4 }}>
                {streaming ? (
                  <StreamingPlainText text={text} active />
                ) : (
                  <MarkdownContent text={text} />
                )}
              </div>
            );
          }
          if (c.type === 'shell') return <ShellMessageView key={i} content={c} streaming={streaming} />;
          if (c.type === 'tool_call' || c.type === 'tool_result') {
            const n = c.tool_name || '';
            if (['view', 'write', 'edit', 'multiedit', 'download'].includes(n)) {
              return <FileToolView key={i} content={c} streaming={streaming} />;
            }
            if (['grep', 'glob', 'ls', 'sourcegraph'].includes(n)) {
              return <SearchToolView key={i} content={c} streaming={streaming} />;
            }
            if (n === 'bash' || n === 'job_output') {
              return <BashToolView key={i} content={c} streaming={streaming} />;
            }
            return <ToolCallView key={i} content={c} streaming={streaming} />;
          }
          if (c.type === 'thinking') {
            return (
              <ThinkingBlock
                key={i}
                text={c.text || ''}
                finished={c.thinking_finished}
                startedAt={c.thinking_started_at}
                finishedAt={c.thinking_finished_at}
                messageFinished={message.finished}
                hasResponseText={hasResponseText}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
