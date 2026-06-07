import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { toJpeg, toPng } from 'html-to-image';

export type ExportFormat = 'jpeg' | 'png' | 'webp';

export interface ExportOptions {
  format: ExportFormat;
  width?: number;
  height?: number;
  scale: number;
  quality: number;
  dpi: number;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function imageSrcToDataUrl(src: string): Promise<string> {
  const resp = await fetch(src);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.drawImage(bitmap, 0, 0);
  return canvas.toDataURL();
}

async function inlineImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(async (img) => {
      if (img.src.startsWith('data:')) return;
      try {
        img.src = await imageSrcToDataUrl(img.src);
      } catch {
        // ignore — leave original src, html-to-image will handle or skip
      }
    }),
  );
}

async function captureElement(element: HTMLElement, options: ExportOptions): Promise<Uint8Array> {
  await inlineImages(element);

  const pixelRatio = options.dpi / 72;
  const commonOpts = {
    pixelRatio,
    quality: options.quality / 100,
    width: options.width ? options.width * pixelRatio : undefined,
    height: options.height ? options.height * pixelRatio : undefined,
  };

  switch (options.format) {
    case 'jpeg':
    case 'webp': {
      const dataUrl = await toJpeg(element, commonOpts);
      return dataUrlToBytes(dataUrl);
    }
    default: {
      const dataUrl = await toPng(element, { pixelRatio: commonOpts.pixelRatio });
      return dataUrlToBytes(dataUrl);
    }
  }
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
