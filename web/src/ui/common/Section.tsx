import { pantera } from '../../theme/pantera';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: pantera.fgMostSubtle,
        letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase',
      }}>{title}</div>
      {children}
    </div>
  );
}
