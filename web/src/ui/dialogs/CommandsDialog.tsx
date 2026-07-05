import { useState } from 'react';
import { pantera } from '../../theme/pantera';
import { DialogOverlay } from './DialogOverlay';

export interface CommandItem {
  id: string;
  label: string;
  category: string;
  action: () => void;
}

export function CommandsDialog({
  commands, onClose,
}: {
  commands: CommandItem[];
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('');

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(filter.toLowerCase()) ||
    c.id.toLowerCase().includes(filter.toLowerCase()),
  );

  const byCat = filtered.reduce<Record<string, CommandItem[]>>((acc, c) => {
    (acc[c.category] ||= []).push(c);
    return acc;
  }, {});

  return (
    <DialogOverlay title="命令" onClose={onClose}>
      <div style={{ padding: 12 }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="/ 或搜索命令..."
          autoFocus
          style={{
            width: '100%', padding: '8px 10px', marginBottom: 8,
            background: pantera.bgLeastVisible, border: `1px solid ${pantera.separator}`,
            borderRadius: 4, color: pantera.fgBase, fontSize: 12,
          }}
        />
        {Object.entries(byCat).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: pantera.fgMostSubtle, marginBottom: 4, textTransform: 'uppercase' }}>{cat}</div>
            {items.map((c) => (
              <div
                key={c.id}
                onClick={() => { c.action(); onClose(); }}
                style={{
                  padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 12,
                  color: pantera.fgBase,
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = pantera.bgLeastVisible; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                {c.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </DialogOverlay>
  );
}
