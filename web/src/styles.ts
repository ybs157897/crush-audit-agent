import { pantera } from './theme/pantera';

export const globalStyles = `
  :root {
    --bg-base: ${pantera.bgBase};
    --bg-less-visible: ${pantera.bgLeastVisible};
    --bg-less-visible2: ${pantera.bgLessVisible};
    --bg-most-visible: ${pantera.bgMostVisible};
    --fg-base: ${pantera.fgBase};
    --fg-subtle: ${pantera.fgMoreSubtle};
    --fg-more-subtle: ${pantera.fgMostSubtle};
    --primary: ${pantera.primary};
    --secondary: ${pantera.secondary};
    --accent: ${pantera.accent};
    --error: ${pantera.error};
    --warning: ${pantera.warning};
    --success: ${pantera.success};
    --info: ${pantera.info};
    --separator: ${pantera.separator};
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body, #root {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  body {
    background: var(--bg-base);
    color: var(--fg-base);
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--bg-most-visible); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--fg-more-subtle); }

  ::selection { background: ${pantera.primary}40; }

  @keyframes crush-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .crush-spin { animation: crush-spin 1s linear infinite; display: inline-block; }

  a { color: ${pantera.info}; text-decoration: none; }
  a:hover { text-decoration: underline; }

  code {
    font-family: inherit;
    background: var(--bg-less-visible);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
  }

  pre {
    background: var(--bg-less-visible);
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;
  }

  pre code { background: none; padding: 0; }
`;
