import { pantera } from '../../theme/pantera';

export function Logo({ size = 'small' }: { size?: 'small' | 'large' }) {
  const fontSize = size === 'large' ? 32 : 20;
  return (
    <div style={{
      fontSize,
      fontWeight: 700,
      letterSpacing: size === 'large' ? 4 : 2,
      fontFamily: 'inherit',
      background: `linear-gradient(135deg, ${pantera.primary} 0%, ${pantera.secondary} 50%, ${pantera.accent} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      filter: size === 'large' ? `drop-shadow(0 0 12px ${pantera.primary}50)` : undefined,
    }}>
      CRUSH
    </div>
  );
}
