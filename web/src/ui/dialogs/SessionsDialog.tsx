import { useState } from 'react';

import { pantera } from '../../theme/pantera';

import type { Session } from '../../api/client';

import { displaySessionTitle } from '../../api/sessionTitle';

import { DialogOverlay } from './DialogOverlay';



export function SessionsDialog({

  sessions, currentId, onSelect, onCreate, onDelete, onRename, onClose,

}: {

  sessions: Session[];

  currentId?: string;

  onSelect: (id: string) => void;

  onCreate: () => void;

  onDelete: (id: string) => void;

  onRename?: (id: string, title: string) => void;

  onClose: () => void;

}) {

  const [filter, setFilter] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState('');



  const filtered = sessions.filter((s) =>

    s.title.toLowerCase().includes(filter.toLowerCase()),

  );



  const startRename = (s: Session) => {

    setEditingId(s.id);

    setEditTitle(s.title);

  };



  const commitRename = () => {

    if (editingId && editTitle.trim() && onRename) {

      onRename(editingId, editTitle.trim());

    }

    setEditingId(null);

  };



  return (

    <DialogOverlay title="会话" onClose={onClose}>

      <div style={{ padding: 12 }}>

        <input

          value={filter}

          onChange={(e) => setFilter(e.target.value)}

          placeholder="过滤..."

          autoFocus

          style={{

            width: '100%', padding: '8px 10px', marginBottom: 8,

            background: pantera.bgLeastVisible, border: `1px solid ${pantera.separator}`,

            borderRadius: 4, color: pantera.fgBase, fontSize: 12,

          }}

        />

        <button onClick={onCreate} style={{

          width: '100%', padding: 8, marginBottom: 8, cursor: 'pointer',

          background: pantera.primary, color: pantera.onPrimary, border: 'none', borderRadius: 4,

        }}>+ 新建会话</button>

        {filtered.map((s) => (

          <div key={s.id} style={{

            padding: '8px 10px', marginBottom: 4, borderRadius: 4,

            background: s.id === currentId ? pantera.bgMostVisible : pantera.bgLeastVisible,

            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,

          }}>

            {editingId === s.id ? (

              <input

                value={editTitle}

                onChange={(e) => setEditTitle(e.target.value)}

                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}

                onBlur={commitRename}

                autoFocus

                style={{

                  flex: 1, padding: '4px 6px', background: pantera.bgBase,

                  border: `1px solid ${pantera.primary}`, borderRadius: 3,

                  color: pantera.fgBase, fontSize: 12,

                }}

              />

            ) : (

              <span onClick={() => { onSelect(s.id); onClose(); }} style={{ flex: 1, color: pantera.fgBase, fontSize: 12, cursor: 'pointer' }}>

                {displaySessionTitle(s.title)}

              </span>

            )}

            <div style={{ display: 'flex', gap: 4 }}>

              {onRename && editingId !== s.id && (

                <button onClick={() => startRename(s)} style={{

                  background: 'none', border: 'none', color: pantera.fgMostSubtle, cursor: 'pointer', fontSize: 11,

                }}>重命名</button>

              )}

              <button onClick={() => {
                if (!window.confirm(`确定删除会话「${displaySessionTitle(s.title)}」？此操作不可恢复。`)) return;
                onDelete(s.id);
              }} style={{

                background: 'none', border: 'none', color: pantera.error, cursor: 'pointer', fontSize: 11,

              }}>删除</button>

            </div>

          </div>

        ))}

      </div>

    </DialogOverlay>

  );

}

