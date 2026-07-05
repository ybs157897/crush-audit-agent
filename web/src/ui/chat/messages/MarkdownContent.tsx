import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { pantera } from '../../../theme/pantera';
import { CodeBlock } from './ToolViews';

const inlineCode: React.CSSProperties = {
  background: pantera.bgMostVisible,
  color: pantera.keyword,
  padding: '1px 6px',
  borderRadius: 4,
  fontSize: '0.88em',
  fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
};

const components: Components = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: 20, fontWeight: 700, color: pantera.fgBase, margin: '20px 0 10px', lineHeight: 1.35 }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: 17, fontWeight: 700, color: pantera.fgBase, margin: '18px 0 8px', lineHeight: 1.35 }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: 15, fontWeight: 600, color: pantera.fgBase, margin: '14px 0 6px', lineHeight: 1.4 }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 style={{ fontSize: 13, fontWeight: 600, color: pantera.fgMoreSubtle, margin: '12px 0 4px' }}>
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p style={{ margin: '0 0 10px', lineHeight: 1.65, color: pantera.fgMoreSubtle, fontSize: 14 }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '0 0 10px', paddingLeft: 22, lineHeight: 1.65, color: pantera.fgMoreSubtle, fontSize: 14 }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '0 0 10px', paddingLeft: 22, lineHeight: 1.65, color: pantera.fgMoreSubtle, fontSize: 14 }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ marginBottom: 4 }}>{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      margin: '0 0 10px', padding: '8px 12px',
      borderLeft: `3px solid ${pantera.primary}`,
      background: pantera.bgLeastVisible,
      color: pantera.fgMoreSubtle,
      borderRadius: '0 6px 6px 0',
    }}>
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr style={{ border: 'none', borderTop: `1px solid ${pantera.separator}`, margin: '16px 0' }} />
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: pantera.info, textDecoration: 'underline' }}>
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong style={{ color: pantera.fgBase, fontWeight: 600 }}>{children}</strong>
  ),
  table: ({ children }) => (
    <div style={{ overflow: 'auto', margin: '10px 0' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse', fontSize: 13,
        border: `1px solid ${pantera.separator}`, borderRadius: 6, overflow: 'hidden',
      }}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ background: pantera.bgMostVisible }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th style={{
      padding: '8px 12px', textAlign: 'left', fontWeight: 600,
      color: pantera.fgBase, borderBottom: `1px solid ${pantera.separator}`,
    }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: '8px 12px', color: pantera.fgMoreSubtle,
      borderBottom: `1px solid ${pantera.separator}40`,
    }}>
      {children}
    </td>
  ),
  code: ({ className, children }) => {
    const text = String(children).replace(/\n$/, '');
    const isBlock = Boolean(className) || text.includes('\n');
    if (!isBlock) {
      return <code style={inlineCode}>{children}</code>;
    }
    return <CodeBlock className={className}>{text}</CodeBlock>;
  },
  pre: ({ children }) => <>{children}</>,
};

export function MarkdownContent({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.65 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
