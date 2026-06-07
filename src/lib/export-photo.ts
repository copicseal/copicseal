import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { snapdom } from '@zumer/snapdom';

export type ExportFormat = 'jpeg' | 'png' | 'webp';

export interface ExportOptions {
  format: ExportFormat;
  width?: number;
  height?: number;
  scale: number;
  quality: number;
  dpi: number;
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

function toSnapdomFormat(f: ExportFormat): 'png' | 'jpeg' | 'webp' {
  return f === 'jpeg' ? 'jpeg' : f === 'webp' ? 'webp' : 'png';
}

async function captureElement(element: HTMLElement, options: ExportOptions): Promise<Uint8Array> {
  const fmt = toSnapdomFormat(options.format);
  const scale = options.dpi / 72;

  const blob = await snapdom.toBlob(element, {
    type: fmt,
    format: fmt,
    quality: options.quality / 100,
    scale,
    width: options.width ? options.width * scale : undefined,
    height: options.height ? options.height * scale : undefined,
    backgroundColor: fmt !== 'png' ? '#ffffff' : undefined,
  });

  return blobToBytes(blob);
}

export async function exportSingle(element: HTMLElement, options: ExportOptions): Promise<void> {
  const bytes = await captureElement(element, options);
  const ext = options.format === 'jpeg' ? 'jpg' : options.format;
  const extLabel = ext.toUpperCase();

  const filePath = await save({
    defaultPath: `copicseal-export.${ext}`,
    filters: [{ name: extLabel, extensions: [ext] }],
  });

  if (!filePath) return;

  await invoke('write_file', { path: filePath, contents: Array.from(bytes) });
}

export async function exportBatch(
  elements: HTMLElement[],
  options: ExportOptions,
  onProgress?: (i: number, total: number) => void,
): Promise<void> {
  for (let i = 0; i < elements.length; i++) {
    try {
      const bytes = await captureElement(elements[i], options);
      const ext = options.format === 'jpeg' ? 'jpg' : options.format;
      const filePath = await save({
        defaultPath: `copicseal-export-${i + 1}.${ext}`,
      });

      if (!filePath) continue;

      await invoke('write_file', { path: filePath, contents: Array.from(bytes) });
      onProgress?.(i + 1, elements.length);
    } catch (err) {
      console.error(`export ${i + 1} failed:`, err);
    }
  }
}
