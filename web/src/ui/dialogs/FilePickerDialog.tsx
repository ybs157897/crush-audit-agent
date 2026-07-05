import { useRef } from 'react';
import { pantera } from '../../theme/pantera';
import { DialogOverlay } from './DialogOverlay';
import type { Attachment } from '../../api/client';
import { attachmentFromFile } from '../common/attachments';

export function FilePickerDialog({
  onSelect,
  onClose,
}: {
  onSelect: (attachments: Attachment[]) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const attachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      attachments.push(await attachmentFromFile(files[i]));
    }
    onSelect(attachments);
    onClose();
  };

  return (
    <DialogOverlay title="添加附件" onClose={onClose}>
      <div style={{ padding: 16, fontSize: 12, color: pantera.fgMoreSubtle }}>
        <p style={{ marginBottom: 12 }}>选择要附加到消息的文件（图片、文本等）。</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button onClick={() => inputRef.current?.click()} style={{
          width: '100%', padding: 10, background: pantera.primary, color: pantera.onPrimary,
          border: 'none', borderRadius: 4, cursor: 'pointer',
        }}>选择文件</button>
      </div>
    </DialogOverlay>
  );
}
