import { snapdom } from '@zumer/snapdom';
import type { ExportServiceContract } from '@/platform/contracts/platform';
import { platformRuntime, writeExifSource } from '@/platform/providers/platform-runtime';
import { webFiles } from '@/platform/providers/web/web-platform-provider';
import type {
  ExportFormat,
  ExportOptions,
  ExportPreset,
  ExportRunContext,
  ExportSizeAdapter,
} from '@/shared/types/export';

const {
  extractJpegExif,
  insertJpegExif,
  isNativeWindowAvailable,
  openDirectoryDialog,
  saveImageDialog,
  writeBinaryFile,
} = platformRuntime;

export type {
  ExportFormat,
  ExportOptions,
  ExportPreset,
  ExportRunContext,
  ExportSizeAdapter,
} from '@/shared/types/export';

export interface ExportTaskState {
  total: number;
  completed: number;
  cancelled: boolean;
}

const exportTasks = new Map<string, ExportTaskState>();

/** 目标框未指定宽度时使用的探针基准 */
const PROBE_BASE = 1000;

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

function toSnapdomFormat(f: ExportFormat): 'png' | 'jpeg' | 'webp' {
  return f === 'jpeg' ? 'jpeg' : f === 'webp' ? 'webp' : 'png';
}

function extensionOf(format: ExportFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

/**
 * 探针 → 测量 → 反解：把画布缩放到目标框内（contain）。
 *
 * `--co-base` 就是画布宽度，模板几何全部是它的倍数，因此内容的高宽比与基准无关。
 * 先在探针基准下量一次比例，即可线性反解出命中目标框的基准值——
 * 主导轴精确命中设定值，另一轴按比例推导，不补边、不变形。
 */
async function solveBaseForContain(adapter: ExportSizeAdapter, preset: ExportPreset) {
  if (preset.width === undefined && preset.height === undefined) {
    return;
  }

  const probe = preset.width ?? PROBE_BASE;
  await adapter.setBase(probe);

  const measured = adapter.measure();
  if (measured.width <= 0 || measured.height <= 0) {
    return;
  }

  const heightPerWidth = measured.height / measured.width;
  const widthLimit = preset.width ?? Number.POSITIVE_INFINITY;
  const heightLimit = preset.height ? preset.height / heightPerWidth : Number.POSITIVE_INFINITY;
  const base = Math.round(Math.min(widthLimit, heightLimit));

  if (Number.isFinite(base) && base > 0 && Math.abs(base - probe) > 0.5) {
    await adapter.setBase(base);
  }
}

async function captureElement(
  element: HTMLElement,
  preset: ExportPreset,
  options: ExportOptions,
  context?: ExportRunContext,
): Promise<Uint8Array> {
  if (context?.sizeAdapter) {
    await solveBaseForContain(context.sizeAdapter, preset);
  }

  const fmt = toSnapdomFormat(preset.format);
  const blob = await snapdom.toBlob(element, {
    type: fmt,
    format: fmt,
    quality: preset.quality / 100,
    scale: Math.max(preset.scale || 1, 1),
    // 固定为 1：输出倍率只能来自用户设置，避免设备 DPI 隐式介入
    dpr: 1,
    backgroundColor: fmt !== 'png' ? '#ffffff' : undefined,
    exclude: options.exclude,
  });

  return blobToBytes(blob);
}

/**
 * 多档导出前确定一次输出目录。
 *
 * 拿到目录时全部档位直接落盘；返回 null 时逐档弹出保存对话框
 * （Web 端退化为逐张下载），避免多档 × 多图产生大量弹窗。
 */
export async function resolveExportDirectory(presetCount: number): Promise<string | null> {
  if (presetCount <= 1 || !isNativeWindowAvailable()) {
    return null;
  }

  return openDirectoryDialog();
}

/** 生成 `名称@宽x高.ext`，同批次内重名时追加序号。 */
function buildFileName(baseName: string, preset: ExportPreset, used: Set<string>): string {
  const ext = extensionOf(preset.format);
  const stem = `${baseName}@${preset.width ?? 'auto'}x${preset.height ?? 'auto'}`;

  let candidate = `${stem}.${ext}`;
  let index = 2;

  while (used.has(candidate)) {
    candidate = `${stem}-${index}.${ext}`;
    index += 1;
  }

  used.add(candidate);
  return candidate;
}

/**
 * 写入单个文件。
 *
 * 指定输出目录时直接落盘（多档导出不再逐档弹窗）；
 * 未指定时沿用保存对话框，Web 端退化为浏览器下载。
 */
async function saveBytes(
  bytes: Uint8Array,
  fileName: string,
  extension: string,
  outputDir?: string | null,
) {
  if (!isNativeWindowAvailable()) {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    await webFiles.save(new Blob([buffer]), fileName);
    return;
  }

  if (outputDir) {
    await writeBinaryFile(`${outputDir}/${fileName}`, Array.from(bytes));
    return;
  }

  const filePath = await saveImageDialog(fileName, extension);
  if (!filePath) {
    return;
  }

  await writeBinaryFile(filePath, Array.from(bytes));
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

/**
 * 按档位逐个导出当前画面。
 *
 * 注意：`options.dpi` 目前只承载语义，尚未写入 EXIF——后端还没有对应的
 * 分辨率写入命令（`src-tauri/src/exif.rs` 只有读取与 JPEG EXIF 段替换）。
 */
export async function exportSingle(
  element: HTMLElement,
  options: ExportOptions,
  source?: string | File,
  context?: ExportRunContext,
): Promise<void> {
  const baseName = context?.baseName?.trim() || 'copicseal-export';
  const used = new Set<string>();

  for (const preset of options.presets) {
    let bytes = await captureElement(element, preset, options, context);
    const fileName = buildFileName(baseName, preset, used);

    if (options.preserveExif && preset.format === 'jpeg' && source) {
      try {
        if (source instanceof File) {
          bytes = await writeExifSource(source, bytes, fileName);
        } else {
          const exifSeg = await extractJpegExif(source);
          const result = await insertJpegExif(Array.from(bytes), exifSeg);
          bytes = new Uint8Array(result);
        }
      } catch (err) {
        console.warn('EXIF 保留失败:', err);
      }
    }

    await saveBytes(bytes, fileName, extensionOf(preset.format), context?.outputDir);
  }
}

export async function exportBatch(
  elements: HTMLElement[],
  options: ExportOptions,
  onProgress?: (i: number, total: number) => void,
  context?: ExportRunContext,
): Promise<void> {
  const taskId = createExportTask(elements.length);
  const baseName = context?.baseName?.trim() || 'copicseal-export';
  const used = new Set<string>();

  for (let i = 0; i < elements.length; i++) {
    const state = getExportTaskState(taskId);
    if (state?.cancelled) {
      break;
    }

    try {
      for (const preset of options.presets) {
        const bytes = await captureElement(elements[i], preset, options, context);
        const fileName = buildFileName(`${baseName}-${i + 1}`, preset, used);
        await saveBytes(bytes, fileName, extensionOf(preset.format), context?.outputDir);
      }

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
