import { pantera } from '../../theme/pantera';

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div style={{
      padding: '8px 16px', background: pantera.error + '20',
      borderBottom: `1px solid ${pantera.error}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 12, color: pantera.error, gridColumn: '1 / -1',
    }}>
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: pantera.error, cursor: 'pointer', fontSize: 14 }}
      >
        ✕
      </button>
    </div>
  );
}
