import { Highlight, type PrismTheme } from 'prism-react-renderer';
import { pantera } from '../../../theme/pantera';
import { chroma } from '../../../theme/chroma';
import { useStreamingReveal } from './StreamingReveal';

export const crushTheme: PrismTheme = {
  plain: { color: pantera.fgBase, backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: chroma.comment } },
    { types: ['keyword', 'builtin', 'important'], style: { color: chroma.keyword } },
    { types: ['string', 'char', 'attr-value', 'regex'], style: { color: chroma.string } },
    { types: ['number', 'boolean'], style: { color: chroma.number } },
    { types: ['function', 'class-name', 'maybe-class-name'], style: { color: chroma.function } },
    { types: ['type', 'tag', 'selector'], style: { color: chroma.type } },
    { types: ['variable', 'property', 'constant'], style: { color: chroma.variable } },
    { types: ['operator', 'punctuation'], style: { color: pantera.fgMoreSubtle } },
  ],
};

export const preBase: React.CSSProperties = {
  margin: 0,
  padding: '12px 14px',
  fontSize: 12,
  lineHeight: 1.55,
  fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
  whiteSpace: 'pre',
  overflow: 'auto',
};

const EXT_LANG: Record<string, string> = {
  go: 'go', ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  py: 'python', rs: 'rust', java: 'java', json: 'json', yaml: 'yaml', yml: 'yaml',
  md: 'markdown', sh: 'bash', bash: 'bash', zsh: 'bash', sql: 'sql',
  html: 'html', css: 'css', scss: 'scss', xml: 'xml', toml: 'toml',
  dockerfile: 'docker', makefile: 'makefile', ps1: 'powershell',
};

export function langFromPath(path: string): string {
  const base = path.split(/[/\\]/).pop() || '';
  const dot = base.lastIndexOf('.');
  if (dot < 0) return 'text';
  return EXT_LANG[base.slice(dot + 1).toLowerCase()] || 'text';
}

export function HighlightedCode({ code, language }: { code: string; language: string }) {
  const lang = language === 'text' ? 'plain' : language;
  return (
    <Highlight theme={crushTheme} code={code} language={lang}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre style={{ ...preBase, ...style }}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}

export function PlainPre({ code, wrap, streaming }: { code: string; wrap?: boolean; streaming?: boolean }) {
  const visible = useStreamingReveal(code, streaming ?? false);
  return (
    <pre style={{
      ...preBase,
      color: pantera.fgMoreSubtle,
      whiteSpace: wrap ? 'pre-wrap' : 'pre',
      wordBreak: wrap ? 'break-word' : undefined,
    }}
    >
      {visible}
      {streaming && visible.length < code.length && (
        <span style={{ color: pantera.busy }}>▍</span>
      )}
    </pre>
  );
}
