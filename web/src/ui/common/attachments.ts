import type { Attachment } from '../../api/client';

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function attachmentFromFile(file: File): Promise<Attachment> {
  const buffer = await file.arrayBuffer();
  return {
    file_path: file.name,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    content: toBase64(buffer),
  };
}

export function attachmentFromText(
  name: string,
  content: string,
  mimeType = 'text/markdown',
): Attachment {
  return {
    file_path: name,
    file_name: name,
    mime_type: mimeType,
    content: btoa(unescape(encodeURIComponent(content))),
  };
}
