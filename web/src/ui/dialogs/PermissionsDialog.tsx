import { pantera } from '../../theme/pantera';
import type { PermissionRequest } from '../../api/client';
import { DialogOverlay } from './DialogOverlay';

export function PermissionsDialog({
  permission, onAllow, onAllowSession, onDeny, onClose,
}: {
  permission: PermissionRequest;
  onAllow: () => void;
  onAllowSession: () => void;
  onDeny: () => void;
  onClose: () => void;
}) {
  return (
    <DialogOverlay title="权限请求" onClose={onClose}>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: pantera.fgBase, marginBottom: 8 }}>
          <strong style={{ color: pantera.secondary }}>{permission.tool_name}</strong>
        </div>
        <div style={{ fontSize: 11, color: pantera.fgMoreSubtle, marginBottom: 12 }}>
          {permission.description}
        </div>
        {permission.path && (
          <div style={{ fontSize: 11, color: pantera.fgMostSubtle, marginBottom: 12, wordBreak: 'break-all' }}>
            {permission.path}
          </div>
        )}
        {permission.params != null && (
          <pre style={{
            fontSize: 10, padding: 8, background: pantera.bgLeastVisible,
            borderRadius: 4, overflow: 'auto', maxHeight: 120, marginBottom: 12,
          }}>
            {JSON.stringify(permission.params, null, 2)}
          </pre>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onAllow} style={btnStyle(pantera.success)}>允许</button>
          <button onClick={onAllowSession} style={btnStyle(pantera.info)}>本会话允许</button>
          <button onClick={onDeny} style={btnStyle(pantera.error)}>拒绝</button>
        </div>
      </div>
    </DialogOverlay>
  );
}

function btnStyle(color: string) {
  return {
    flex: 1, padding: '8px 12px', border: 'none', borderRadius: 4,
    background: color, color: pantera.bgBase, cursor: 'pointer', fontSize: 12,
  } as const;
}
