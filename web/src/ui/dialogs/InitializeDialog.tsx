import { pantera } from '../../theme/pantera';
import { DialogOverlay } from './DialogOverlay';
import { Logo } from '../common/Logo';

export function InitializeDialog({
  onInitialize,
  onSkip,
}: {
  onInitialize: () => void;
  onSkip: () => void;
}) {
  return (
    <DialogOverlay title="初始化项目" onClose={onSkip}>
      <div style={{ padding: 20, textAlign: 'center' }}>
        <Logo size="large" />
        <p style={{ fontSize: 13, color: pantera.fgMoreSubtle, margin: '16px 0' }}>
          此工作区尚未初始化。Crush 可以分析项目结构并生成上下文说明。
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={onInitialize} style={{
            padding: '8px 20px', background: pantera.primary, color: pantera.onPrimary,
            border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
          }}>初始化项目</button>
          <button onClick={onSkip} style={{
            padding: '8px 20px', background: pantera.bgMostVisible, color: pantera.fgBase,
            border: `1px solid ${pantera.separator}`, borderRadius: 4, cursor: 'pointer', fontSize: 13,
          }}>跳过</button>
        </div>
      </div>
    </DialogOverlay>
  );
}
