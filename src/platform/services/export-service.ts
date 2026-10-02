import { snapdom } from '@zumer/snapdom';
import { capEmbeddedImages } from '@/core/renderer';
import type { ExportServiceContract } from '@/platform/contracts/platform';
import { platformRuntime, writeExifSource } from '@/platform/providers/platform-runtime';
import { webFiles } from '@/platform/providers/web/web-platform-provider';
import type {
  ExportFormat,
  ExportOptions,
  ExportPreset,
  ExportRunContext,
} from '@/shared/types/export';

const {
  extractJpegExif,
  getConfig,
  insertJpegExif,
  isNativeWindowAvailable,
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

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

function toSnapdomFormat(f: ExportFormat): 'png' | 'jpeg' {
  return f === 'jpeg' ? 'jpeg' : 'png';
}

/**
 * 扩展名只认 jpeg / png 两种。
 *
 * 不直接返回 `format`：拼图的导出设置是持久化的，万一存着历史值（比如已经不支持的
 * webp），按它拼扩展名就会产出后缀与内容不符的文件；这里统一收敛到 png。
 */
function extensionOf(format: ExportFormat): string {
  return format === 'jpeg' ? 'jpg' : 'png';
}

async function captureElement(
  element: HTMLElement,
  preset: ExportPreset,
  options: ExportOptions,
  context?: ExportRunContext,
): Promise<Uint8Array> {
  // 尺寸解算交给页面侧的适配器：只有它知道背景模式与画布结构
  if (context?.sizeAdapter) {
    await context.sizeAdapter.prepare({ width: preset.width, height: preset.height });
  }

  const fmt = toSnapdomFormat(preset.format);
  const scale = Math.max(preset.scale || 1, 1);
  // 快照会把图片内联进 SVG；原图过大时（照片背景会让同一张图内联两次）WebKit 会整块丢弃，
  // 因此先压到本次导出实际需要的分辨率，抓完再还原
  const restoreImages = await capEmbeddedImages(element, { scale });

  try {
    const blob = await snapdom.toBlob(element, {
      type: fmt,
      format: fmt,
      quality: preset.quality / 100,
      scale,
      // 固定为 1：输出倍率只能来自用户设置，避免设备 DPI 隐式介入
      dpr: 1,
      backgroundColor: fmt !== 'png' ? '#ffffff' : undefined,
      exclude: options.exclude,
    });

    return blobToBytes(blob);
  } finally {
    restoreImages();
  }
}

/**
 * 导出落盘目录：直接取配置里的「保存目录」，导出过程不再弹保存对话框。
 *
 * 读不到配置（或目录为空）时返回 null，调用方会退回逐张保存对话框兜底；
 * Web 端没有本地目录的概念，同样返回 null（最终退化为浏览器下载）。
 */
export async function resolveExportDirectory(): Promise<string | null> {
  if (!isNativeWindowAvailable()) {
    return null;
  }

  try {
    const config = await getConfig();
    return config.save_directory?.trim() || null;
  } catch (error) {
    console.warn('读取导出目录失败:', error);
    return null;
  }
}

/** 去掉文件名里的路径分隔符与非法字符，避免写到目标目录之外。 */
function sanitizeFileName(name: string): string {
  return (
    [...name]
      // 控制字符没法写进正则（biome 的 noControlCharactersInRegex 会拦），逐个滤掉
      .filter((char) => char.charCodeAt(0) >= 0x20)
      .join('')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.+$/, '')
      .slice(0, 120)
  );
}

/** 用户手填的名字自带图片扩展名时忽略它，统一按 format 生成，避免出现 `.png.png`。 */
const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|webp)$/i;

/**
 * 生成最终文件名。
 *
 * 名字优先用档位自己填的 `fileName`，留空则回落到 `<原图名>@<宽>x<高>`；
 * 扩展名始终由 `format` 决定，同批次重名时追加序号。
 */
function buildFileName(baseName: string, preset: ExportPreset, used: Set<string>): string {
  const ext = extensionOf(preset.format);
  const custom = preset.fileName?.trim();
  const rawStem = custom
    ? custom.replace(IMAGE_EXTENSION_PATTERN, '')
    : `${baseName}@${preset.width}x${preset.height}`;
  const stem = sanitizeFileName(rawStem) || baseName;

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
