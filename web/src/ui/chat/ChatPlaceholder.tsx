import { pantera } from '../../theme/pantera';
import { workspaceLabel } from '../common/utils';
import type { ReactNode } from 'react';

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了，注意休息';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  if (h < 22) return '晚上好';
  return '夜深了，注意休息';
}

const DEFAULT_SUGGESTIONS = [
  '解释这个项目的结构',
  '帮我修一个 bug',
  '写单元测试',
  '审查最近的代码变更',
];

export function ChatPlaceholder({
  workspacePath,
  modelName,
  skills,
  composer,
  onSuggestion,
}: {
  workspacePath?: string;
  modelName?: string;
  skills?: Array<{ name: string; description: string }>;
  composer: ReactNode;
  onSuggestion: (text: string) => void;
}) {
  const wsName = workspacePath ? workspaceLabel(workspacePath) : '工作区';
  const skillSuggestions = (skills ?? [])
    .slice(0, 2)
    .map((s) => s.description || `使用 ${s.name} 技能`);
  const suggestions = [...skillSuggestions, ...DEFAULT_SUGGESTIONS].slice(0, 4);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      gap: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 720, width: '100%' }}>
        <div style={{ fontSize: 13, color: pantera.fgMostSubtle, marginBottom: 6 }}>
          {wsName}
        </div>
        <div style={{ fontSize: 26, fontWeight: 500, color: pantera.fgBase, marginBottom: 8 }}>
          {timeGreeting()}
        </div>
        <div style={{ fontSize: 13, color: pantera.fgMoreSubtle }}>
          {modelName ? `当前模型：${modelName}` : '选择模型，描述你想完成的任务'}
        </div>
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
        maxWidth: 720, width: '100%',
      }}>
        {suggestions.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => onSuggestion(text)}
            style={{
              padding: '8px 14px', borderRadius: 20,
              border: `1px solid ${pantera.separator}`,
              background: pantera.bgLeastVisible,
              color: pantera.fgMoreSubtle, fontSize: 12, cursor: 'pointer',
              maxWidth: 280, textAlign: 'left',
            }}
          >
            {text}
          </button>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 720 }}>
        {composer}
      </div>
    </div>
  );
}
