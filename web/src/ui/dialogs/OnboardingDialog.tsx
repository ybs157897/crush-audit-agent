import { pantera } from '../../theme/pantera';
import { DialogOverlay } from './DialogOverlay';

export function OnboardingDialog({ onContinue }: { onContinue: () => void }) {
  return (
    <DialogOverlay title="欢迎使用 Crush" onClose={onContinue}>
      <div style={{ padding: 16, fontSize: 12, color: pantera.fgMoreSubtle }}>
        <p style={{ marginBottom: 12 }}>请确保已配置 LLM 提供商（crush.json）并启动 Crush 服务。</p>
        <button onClick={onContinue} style={{
          padding: '8px 16px', background: pantera.primary, color: pantera.onPrimary,
          border: 'none', borderRadius: 4, cursor: 'pointer',
        }}>继续</button>
      </div>
    </DialogOverlay>
  );
}

export function ApiKeyDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogOverlay title="API Key" onClose={onClose}>
      <div style={{ padding: 16, fontSize: 12, color: pantera.fgMoreSubtle }}>
        请在 crush.json 或环境变量中配置 API Key。
      </div>
    </DialogOverlay>
  );
}
