import { pantera } from '../../theme/pantera';

import type { Todo } from '../../api/client';

import { useUi } from '../state/store';



const STATUS_CYCLE = ['pending', 'in_progress', 'completed'];



export function PillsPanel({

  todos, queuedCount, queuedPrompts, expanded, onToggleTodo,

}: {

  todos: Todo[];

  queuedCount: number;

  queuedPrompts: string[];

  expanded: boolean;

  onToggleTodo?: (index: number, status: string) => void;

}) {

  const { state, dispatch } = useUi();

  const incomplete = todos.filter((t) => t.status !== 'completed');

  const hasContent = incomplete.length > 0 || queuedCount > 0;

  if (!hasContent && !expanded) return null;



  const section = state.pillsSection;



  const cycleStatus = (current: string) => {

    const idx = STATUS_CYCLE.indexOf(current);

    return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];

  };



  return (

    <div style={{

      borderTop: `1px solid ${pantera.separator}`,

      background: pantera.bgLessVisible,

      fontSize: 11,

      maxHeight: expanded ? 200 : 28,

      overflow: 'hidden',

      transition: 'max-height 0.2s ease',

    }}>

      <div

        onClick={() => dispatch({ type: 'TOGGLE_PILLS' })}

        style={{

          padding: '4px 12px', cursor: 'pointer', display: 'flex', gap: 12,

          color: pantera.fgMoreSubtle, alignItems: 'center',

        }}

      >

        <span style={{ color: pantera.secondary }}>

          {expanded ? '▼' : '▶'} Pills

        </span>

        {incomplete.length > 0 && (

          <button

            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_PILLS_SECTION', section: 'todos' }); }}

            style={{

              background: section === 'todos' ? pantera.bgMostVisible : 'transparent',

              border: 'none', color: pantera.fgMoreSubtle, cursor: 'pointer', padding: '2px 6px', borderRadius: 3,

            }}

          >

            Todo ({incomplete.length})

          </button>

        )}

        {queuedCount > 0 && (

          <button

            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_PILLS_SECTION', section: 'queue' }); }}

            style={{

              background: section === 'queue' ? pantera.bgMostVisible : 'transparent',

              border: 'none', color: pantera.fgMoreSubtle, cursor: 'pointer', padding: '2px 6px', borderRadius: 3,

            }}

          >

            Queue ({queuedCount})

          </button>

        )}

      </div>

      {expanded && (

        <div style={{ padding: '0 12px 8px', overflow: 'auto', maxHeight: 160 }}>

          {section === 'todos' && todos.map((t, i) => (

            <div

              key={i}

              onClick={() => onToggleTodo?.(i, cycleStatus(t.status))}

              style={{

                color: t.status === 'completed' ? pantera.fgMostSubtle : pantera.fgMoreSubtle,

                marginBottom: 2, cursor: onToggleTodo ? 'pointer' : 'default',

                textDecoration: t.status === 'completed' ? 'line-through' : 'none',

              }}

            >

              {t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '◌' : '○'} {t.content}

            </div>

          ))}

          {section === 'queue' && queuedPrompts.map((p, i) => (

            <div key={i} style={{ color: pantera.fgMoreSubtle, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>

              {i + 1}. {p}

            </div>

          ))}

        </div>

      )}

    </div>

  );

}

