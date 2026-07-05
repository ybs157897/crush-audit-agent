import { pantera } from '../../theme/pantera';

export function DialogOverlay({
  children, onClose, title, width = 'min(520px, 90vw)', maxHeight = '70vh',
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  width?: string;
  maxHeight?: string;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: pantera.bgBase, border: `1px solid ${pantera.separator}`,
          borderRadius: 8, width, maxHeight,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${pantera.separator}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: pantera.fgBase, fontWeight: 600 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: pantera.fgMoreSubtle, cursor: 'pointer' }}>Esc</button>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
