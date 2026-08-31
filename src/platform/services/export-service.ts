import { snapdom } from '@zumer/snapdom';
import type { ExportServiceContract } from '@/platform/contracts/platform';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { webFiles } from '@/platform/providers/web/web-platform-provider';
import type { ExportFormat, ExportOptions } from '@/shared/types/export';

const {
  extractJpegExif,
  insertJpegExif,
  isNativeWindowAvailable,
  saveImageDialog,
  writeBinaryFile,
} = platformRuntime;

export type { ExportFormat, ExportOptions } from '@/shared/types/export';

export interface ExportTaskState {
  total: number;
  completed: number;
  cancelled: boolean;
}

const exportTasks = new Map<string, ExportTaskState>();

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

function toSnapdomFormat(f: ExportFormat): 'png' | 'jpeg' | 'webp' {
  return f === 'jpeg' ? 'jpeg' : f === 'webp' ? 'webp' : 'png';
}

async function captureElement(element: HTMLElement, options: ExportOptions): Promise<Uint8Array> {
  const fmt = toSnapdomFormat(options.format);
  const scale = Math.max(options.scale || 1, 1);

  const blob = await snapdom.toBlob(element, {
    type: fmt,
    format: fmt,
    quality: options.quality / 100,
    scale,
    width: options.width ? options.width * scale : undefined,
    height: options.height ? options.height * scale : undefined,
    backgroundColor: fmt !== 'png' ? '#ffffff' : undefined,
    exclude: options.exclude,
  });

  return blobToBytes(blob);
}

function measureContainer(el: HTMLElement): { width: number; height: number } {
  const inner = el.firstElementChild as HTMLElement | null;
  if (inner) {
    const rect = inner.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { width: rect.width, height: rect.height };
    }
  }
  const rect = el.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

export function createExportTask(total: number) {
  const id = `export-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  exportTasks.set(id, {
    total,
    completed: 0,
    cancelled: false,
  });
  return id;
}

export function getExportTaskState(taskId: string): ExportTaskState | null {
  return exportTasks.get(taskId) ?? null;
}

export function cancelExportTask(taskId: string) {
  const current = exportTasks.get(taskId);
  if (!current) {
    return;
  }

  exportTasks.set(taskId, {
    ...current,
    cancelled: true,
  });
}

export async function exportSingle(
  element: HTMLElement,
  options: ExportOptions,
  sourcePath?: string,
  setBaseSize?: (v: number) => Promise<void>,
): Promise<void> {
  const initialBaseSize = 1000;

  if (setBaseSize && (options.width || options.height)) {
    const pixelRatio = options.dpi / 72;
    const targetW = options.width ? options.width * pixelRatio : undefined;

    await setBaseSize(initialBaseSize);

    const measured = measureContainer(element);
    const measuredW = measured.width;

    if (targetW && measuredW > 0) {
      const corrected = Math.round((initialBaseSize * targetW) / measuredW);
      await setBaseSize(corrected);
    }
  }

  let bytes = await captureElement(element, options);

  if (options.preserveExif && options.format === 'jpeg' && sourcePath) {
    try {
      const exifSeg = await extractJpegExif(sourcePath);
      const result = await insertJpegExif(Array.from(bytes), exifSeg);
      bytes = new Uint8Array(result);
    } catch (err) {
      console.warn('EXIF 保留失败:', err);
    }
  }

  const ext = options.format === 'jpeg' ? 'jpg' : options.format;
  const fileName = `copicseal-export.${ext}`;
  if (!isNativeWindowAvailable()) {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    await webFiles.save(new Blob([buffer]), fileName);
    if (setBaseSize) await setBaseSize(initialBaseSize);
    return;
  }

  const filePath = await saveImageDialog(fileName, ext);

  if (!filePath) {
    if (setBaseSize) await setBaseSize(initialBaseSize);
    return;
  }

  await writeBinaryFile(filePath, Array.from(bytes));

  if (setBaseSize) await setBaseSize(initialBaseSize);
}

export async function exportBatch(
  elements: HTMLElement[],
  options: ExportOptions,
  onProgress?: (i: number, total: number) => void,
): Promise<void> {
  const taskId = createExportTask(elements.length);

  for (let i = 0; i < elements.length; i++) {
    const state = getExportTaskState(taskId);
    if (state?.cancelled) {
      break;
    }

    try {
      const bytes = await captureElement(elements[i], options);
      const ext = options.format === 'jpeg' ? 'jpg' : options.format;
      const filePath = await saveImageDialog(`copicseal-export-${i + 1}.${ext}`, ext);

      if (!filePath) {
        continue;
      }

      await writeBinaryFile(filePath, Array.from(bytes));
      exportTasks.set(taskId, {
        total: elements.length,
        completed: i + 1,
        cancelled: false,
      });
      onProgress?.(i + 1, elements.length);
    } catch (err) {
      console.error(`export ${i + 1} failed:`, err);
    }
  }
}

export class ExportService implements ExportServiceContract {
  exportSingle = exportSingle;
  createExportTask = createExportTask;
  getExportTaskState = getExportTaskState;
  cancelExportTask = cancelExportTask;
}

export const exportService = new ExportService();
