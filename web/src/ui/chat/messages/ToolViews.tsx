import { useState } from 'react';
import { pantera } from '../../../theme/pantera';
import type { MessageContent } from '../../../api/client';
import { BlockContainer, langIcon, normalizeLang } from './BlockContainer';
import { HighlightedCode, PlainPre } from './codeHighlight';
import { useStreamingReveal } from './StreamingReveal';

export function CodeBlock({ className, children }: { className?: string; children: string }) {
  const code = children.trim();
  const rawLang = className?.replace('language-', '') || 'text';
  const lang = normalizeLang(rawLang);
  const label = lang === 'text' ? 'text' : lang;
  const icon = langIcon(lang);
  const lines = code.split('\n').length;

  if (lang === 'text') {
    return (
      <BlockContainer
        label={label}
        icon={icon}
        copyText={code}
        lineCount={lines}
        collapsible
        defaultCollapsed={lines > 50}
      >
        <PlainPre code={code} wrap />
      </BlockContainer>
    );
  }

  return (
    <BlockContainer
      label={label}
      icon={icon}
      copyText={code}
      lineCount={lines}
      collapsible
      defaultCollapsed={lines > 50}
    >
      <HighlightedCode code={code} language={lang} />
    </BlockContainer>
  );
}

function OutputBlock({
  output,
  streaming,
  defaultCollapsed,
}: {
  output: string;
  streaming?: boolean;
  defaultCollapsed?: boolean;
}) {
  const text = output.slice(0, 50000);
  const visible = useStreamingReveal(text, streaming ?? false);
  return (
    <BlockContainer
      label="output"
      icon="▤"
      copyText={text}
      lineCount={text.split('\n').length}
      collapsible
      defaultCollapsed={defaultCollapsed ?? text.split('\n').length > 30}
    >
      <PlainPre code={visible} wrap streaming={false} />
      {streaming && visible.length < text.length && (
        <div style={{ padding: '0 14px 8px', fontSize: 10, color: pantera.busy }}>输出中...</div>
      )}
    </BlockContainer>
  );
}

export function ToolCallView({ content, streaming }: { content: MessageContent; streaming?: boolean }) {
  const [expanded, setExpanded] = useState(Boolean(content.tool_output));
  const name = content.tool_name || 'unknown';
  const status = content.status || 'done';
  const statusColor = status === 'error' ? pantera.error : status === 'running' ? pantera.busy : pantera.success;
  const statusIcon = status === 'error' ? '✗' : status === 'running' ? '◌' : '✓';

  return (
    <div style={{
      margin: '8px 0', border: `1px solid ${pantera.separator}`, borderRadius: 8,
      background: pantera.bgLeastVisible, overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
          background: pantera.bgBase, borderBottom: expanded ? `1px solid ${pantera.separator}` : 'none',
        }}
      >
        <span style={{ color: statusColor }}>{statusIcon}</span>
        <span style={{ color: pantera.secondary, fontWeight: 500 }}>{name}</span>
        <span style={{ color: pantera.fgMostSubtle, marginLeft: 'auto', fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '4px 8px 8px', fontSize: 11 }}>
          {content.tool_input && Object.keys(content.tool_input).length > 0 && (
            <BlockContainer label="input" icon="{ }" copyText={JSON.stringify(content.tool_input, null, 2)} collapsible>
              <PlainPre code={JSON.stringify(content.tool_input, null, 2)} wrap />
            </BlockContainer>
          )}
          {content.tool_output && (
            <OutputBlock output={content.tool_output} streaming={streaming} />
          )}
        </div>
      )}
    </div>
  );
}

export function BashToolView({ content, streaming }: { content: MessageContent; streaming?: boolean }) {
  const input = content.tool_input || {};
  const cmd = String(input.command || content.command || '').trim();
  const output = content.tool_output || '';
  const running = content.status === 'running';

  return (
    <div style={{ margin: '8px 0' }}>
      {cmd && (
        <BlockContainer label="bash" icon="⌨" copyText={cmd}>
          <HighlightedCode code={cmd} language="bash" />
        </BlockContainer>
      )}
      {running && !output && (
        <div style={{ padding: '6px 12px', fontSize: 11, color: pantera.busy }}>执行中...</div>
      )}
      {output && (
        <OutputBlock output={output} streaming={streaming} />
      )}
    </div>
  );
}

export function ShellMessageView({ content, streaming }: { content: MessageContent; streaming?: boolean }) {
  const exitOk = (content.exit_code ?? 0) === 0;
  const cmd = content.command || '';
  const output = content.tool_output || '';

  return (
    <div style={{ margin: '8px 0' }}>
      {cmd && (
        <BlockContainer label="bash" icon="⌨" copyText={cmd}>
          <HighlightedCode code={cmd} language="bash" />
          <div style={{
            padding: '4px 12px 8px', fontSize: 10, textAlign: 'right',
            color: exitOk ? pantera.success : pantera.error,
          }}>
            exit {content.exit_code ?? 0}
          </div>
        </BlockContainer>
      )}
      {output && (
        <OutputBlock output={output} streaming={streaming} defaultCollapsed={false} />
      )}
    </div>
  );
}

export function renderToolContent(content: MessageContent) {
  const name = content.tool_name || '';
  if (name === 'bash' || name === 'job_output' || name === 'job_kill') {
    return <BashToolView content={content} />;
  }
  if (['view', 'write', 'edit', 'multiedit', 'download', 'grep', 'glob', 'ls', 'fetch', 'web_fetch', 'web_search'].includes(name)) {
    return <ToolCallView content={content} />;
  }
  return <ToolCallView content={content} />;
}
