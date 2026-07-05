import { useState } from 'react';
import { pantera } from '../../../theme/pantera';
import type { MessageContent } from '../../../api/client';
import { BlockContainer, langIcon, normalizeLang } from './BlockContainer';
import { HighlightedCode, PlainPre, langFromPath } from './codeHighlight';
import { MarkdownContent } from './MarkdownContent';
import { useStreamingReveal } from './StreamingReveal';

function basename(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

function DiffBlocks({ oldStr, newStr }: { oldStr: string; newStr: string }) {
  return (
    <>
      {oldStr && (
        <BlockContainer label="删除" icon="−" copyText={oldStr} maxHeight={240}>
          <PlainPre code={oldStr} wrap />
        </BlockContainer>
      )}
      {newStr && (
        <BlockContainer label="新增" icon="+" copyText={newStr} maxHeight={240}>
          <pre style={{
            margin: 0, padding: '12px 14px', fontSize: 12, lineHeight: 1.55,
            fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
            whiteSpace: 'pre-wrap', color: pantera.success,
          }}
          >
            {newStr}
          </pre>
        </BlockContainer>
      )}
    </>
  );
}

function FileContent({ path, content, streaming }: { path: string; content: string; streaming?: boolean }) {
  const lang = normalizeLang(langFromPath(path));
  const visible = useStreamingReveal(content, streaming ?? false);
  const lines = content.split('\n').length;
  const label = basename(path) || lang;

  if (lang === 'markdown' && !streaming) {
    return (
      <BlockContainer
        label={label}
        icon={langIcon('markdown')}
        subtitle={path}
        copyText={content}
        lineCount={lines}
        collapsible
        defaultCollapsed={lines > 40}
      >
        <div style={{ padding: '8px 14px 12px' }}>
          <MarkdownContent text={content} />
        </div>
      </BlockContainer>
    );
  }

  if (lang === 'markdown' && streaming) {
    return (
      <BlockContainer
        label={label}
        icon={langIcon('markdown')}
        subtitle={path}
        copyText={content}
        lineCount={lines}
      >
        <PlainPre code={visible} wrap streaming={false} />
      </BlockContainer>
    );
  }

  if (lang === 'text') {
    return (
      <BlockContainer
        label={label}
        icon="📄"
        subtitle={path}
        copyText={content}
        lineCount={lines}
        collapsible
        defaultCollapsed={!streaming && lines > 40}
      >
        <PlainPre code={visible} wrap streaming={streaming} />
      </BlockContainer>
    );
  }

  return (
    <BlockContainer
      label={label}
      icon={langIcon(lang)}
      subtitle={path}
      copyText={content}
      lineCount={lines}
      collapsible
      defaultCollapsed={!streaming && lines > 40}
    >
      <HighlightedCode code={visible} language={lang} />
    </BlockContainer>
  );
}

export function FileToolView({ content, streaming }: { content: MessageContent; streaming?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const name = content.tool_name || 'file';
  const input = content.tool_input || {};
  const path = String(input.file_path || input.path || input.target_file || '');
  const oldStr = String(input.old_string || '');
  const newStr = String(input.new_string || input.content || '');
  const isEdit = name === 'edit' || name === 'multiedit' || name === 'write';
  const output = content.tool_output || '';
  const status = content.status || 'done';
  const statusColor = status === 'error' ? pantera.error : status === 'running' ? pantera.busy : pantera.success;

  return (
    <div style={{
      margin: '8px 0', border: `1px solid ${pantera.separator}`, borderRadius: 8,
      background: pantera.bgLeastVisible, overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, background: pantera.bgBase,
          borderBottom: expanded ? `1px solid ${pantera.separator}` : 'none',
        }}
      >
        <span style={{ color: statusColor }}>
          {status === 'running' ? '◌' : status === 'error' ? '✗' : '📄'}
        </span>
        <span style={{ color: pantera.secondary, fontWeight: 500 }}>{name}</span>
        {path && (
          <span style={{
            color: pantera.fgMostSubtle, fontSize: 11,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {path}
          </span>
        )}
        <span style={{ color: pantera.fgMostSubtle, fontSize: 10, flexShrink: 0 }}>
          {expanded ? '▼' : '▶'}
        </span>
      </div>
      {expanded && (
        <div style={{ padding: '4px 8px 8px' }}>
          {status === 'running' && !output && (
            <div style={{ padding: '6px 4px', fontSize: 11, color: pantera.busy }}>读取中...</div>
          )}
          {isEdit && (oldStr || newStr) && <DiffBlocks oldStr={oldStr} newStr={newStr} />}
          {output && !isEdit && <FileContent path={path} content={output} streaming={streaming} />}
          {output && isEdit && !oldStr && !newStr && <FileContent path={path} content={output} streaming={streaming} />}
          {!output && isEdit && newStr && !oldStr && (
            <FileContent path={path} content={newStr} streaming={streaming} />
          )}
          {!output && !newStr && !oldStr && Object.keys(input).length > 0 && status !== 'running' && (
            <BlockContainer label="input" icon="{ }" copyText={JSON.stringify(input, null, 2)}>
              <PlainPre code={JSON.stringify(input, null, 2)} wrap />
            </BlockContainer>
          )}
        </div>
      )}
    </div>
  );
}

export function SearchToolView({ content, streaming }: { content: MessageContent; streaming?: boolean }) {
  const [expanded, setExpanded] = useState(Boolean(content.tool_output));
  const name = content.tool_name || 'search';
  const input = content.tool_input || {};
  const output = content.tool_output || '';
  const pattern = String(input.pattern || input.query || input.regex || '');
  const path = String(input.path || input.directory || '');

  const summary = pattern || path || JSON.stringify(input).slice(0, 80);

  return (
    <div style={{
      margin: '8px 0', border: `1px solid ${pantera.separator}`, borderRadius: 8,
      background: pantera.bgLeastVisible, overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, background: pantera.bgBase,
          borderBottom: expanded ? `1px solid ${pantera.separator}` : 'none',
        }}
      >
        <span style={{ color: pantera.accent }}>⌕</span>
        <span style={{ color: pantera.secondary, fontWeight: 500 }}>{name}</span>
        <span style={{
          color: pantera.fgMostSubtle, fontSize: 11,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {summary}
        </span>
        <span style={{ color: pantera.fgMostSubtle, fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '4px 8px 8px' }}>
          {Object.keys(input).length > 0 && (
            <BlockContainer label="input" icon="{ }" copyText={JSON.stringify(input, null, 2)} collapsible>
              <PlainPre code={JSON.stringify(input, null, 2)} wrap />
            </BlockContainer>
          )}
          {output && (
            <BlockContainer
              label="results"
              icon="▤"
              copyText={output}
              lineCount={output.split('\n').length}
              collapsible
              defaultCollapsed={!streaming && output.split('\n').length > 30}
            >
              <PlainPre code={output} wrap streaming={streaming} />
            </BlockContainer>
          )}
        </div>
      )}
    </div>
  );
}
