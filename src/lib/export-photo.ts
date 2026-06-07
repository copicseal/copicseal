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

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch?.[1] || 'image/png';
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function captureElement(element: HTMLElement, options: ExportOptions): Promise<Blob> {
  const pixelRatio = options.dpi / 72;
  const commonOpts = {
    pixelRatio,
    quality: options.quality / 100,
    width: options.width ? options.width * pixelRatio : undefined,
    height: options.height ? options.height * pixelRatio : undefined,
  };

  switch (options.format) {
    case 'jpeg': {
      const dataUrl = await toJpeg(element, commonOpts);
      return dataUrlToBlob(dataUrl);
    }
    case 'webp': {
      const dataUrl = await toJpeg(element, commonOpts);
      return dataUrlToBlob(dataUrl);
    }
    default: {
      const dataUrl = await toPng(element, { pixelRatio: commonOpts.pixelRatio });
      return dataUrlToBlob(dataUrl);
    }
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportSingle(element: HTMLElement, options: ExportOptions): Promise<void> {
  const blob = await captureElement(element, options);
  const ext = options.format === 'jpeg' ? 'jpg' : options.format;
  downloadBlob(blob, `copicseal-export.${ext}`);
}

export async function exportBatch(
  elements: HTMLElement[],
  options: ExportOptions,
  onProgress?: (i: number, total: number) => void,
): Promise<void> {
  for (let i = 0; i < elements.length; i++) {
    try {
      const blob = await captureElement(elements[i], options);
      const ext = options.format === 'jpeg' ? 'jpg' : options.format;
      downloadBlob(blob, `copicseal-export-${i + 1}.${ext}`);
      onProgress?.(i + 1, elements.length);
    } catch (err) {
      console.error(`导出第 ${i + 1} 张失败:`, err);
    }
  }
}
