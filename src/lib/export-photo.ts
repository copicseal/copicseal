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
      const res = await fetch(dataUrl);
      return res.blob();
    }
    case 'webp': {
      const dataUrl = await toJpeg(element, commonOpts);
      const res = await fetch(dataUrl);
      return res.blob();
    }
    default: {
      const dataUrl = await toPng(element, { pixelRatio: commonOpts.pixelRatio });
      const res = await fetch(dataUrl);
      return res.blob();
    }
  }
}

export async function exportSingle(element: HTMLElement, options: ExportOptions): Promise<void> {
  const blob = await captureElement(element, options);
  const ext = options.format === 'jpeg' ? 'jpg' : options.format;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `copicseal-export.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `copicseal-export-${i + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onProgress?.(i + 1, elements.length);
    } catch (err) {
      console.error(`导出第 ${i + 1} 张失败:`, err);
    }
  }
}
