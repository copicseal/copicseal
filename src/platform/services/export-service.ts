import { type LocalFont, snapdom } from '@zumer/snapdom';
import { capEmbeddedImages } from '@/core/renderer';
import type { OutputPreset, OutputSize } from '@/platform/contracts';
import type { ExportServiceContract } from '@/platform/contracts/platform';
import { platformRuntime, writeExifSource } from '@/platform/providers/platform-runtime';
import { webFiles } from '@/platform/providers/web/web-platform-provider';
import { findImportedFont } from '@/shared/lib/inline-font-registry';
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
  updateConfig,
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

/** 同一批导出里画布文字往往不变，子集化结果按「字体栈 + 文字」缓存，省掉重复解析 */
const snapshotFontCache = new Map<string, LocalFont[]>();

/**
 * 通用字体族：它们由引擎自己解析，没有可查的字型文件，不必浪费一次平台查询。
 */
const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
]);

/** 一条字体栈里最多内联几个族：子集本身很小，但每个都要解析一次字体文件 */
const MAX_INLINE_FAMILIES = 3;

/** 画布根节点；模板运行时把用户选的字体写在这层的内联样式上。 */
const CANVAS_BOX_SELECTOR = '[data-co-canvas-box]';

/**
 * 取画布上实际使用的字体族。
 *
 * 内联样式形如 `"PingFang SC", sans-serif`，只取第一个族名；没有写字体（跟随
 * 模板/框架默认）时返回空列表。
 *
 * 画布上写的是一整条字体栈（用户选的字体、模板自带的字体栈都写在这一层），
 * 因此这里要把栈拆开：真正能查到字型的往往是栈里第一个**具体**字体族，而不是
 * 开头的 `ui-monospace` 这类通用族。
 */
function readCanvasFontFamilies(element: HTMLElement): string[] {
  const canvas = element.querySelector<HTMLElement>(CANVAS_BOX_SELECTOR);
  const stack = canvas?.style.fontFamily ?? '';

  return stack
    .split(',')
    .map((family) => family.trim().replace(/^["']|["']$/g, ''))
    .filter((family) => family.length > 0 && !GENERIC_FONT_FAMILIES.has(family.toLowerCase()));
}

/**
 * 快照要内联的字体。
 *
 * 快照的实现是「把 DOM 序列化进 SVG 图片再栅格化」，而 SVG 图片文档拿不到系统
 * 字体表：不内联的话，用户选的字体在导出里会退回浏览器默认字体，字宽一变就会
 * 出现文字溢出画框、本该一行的文案换行。
 *
 * 字体本身由平台侧按画布上用到的字符做子集化（中文字体原始文件几十兆，整体内联
 * 会被 WebKit 直接丢掉），这里只负责把画布上的文字与字体栈交出去。栈里可能有
 * 多个能查到的族（比如等宽栈里的 Menlo、Monaco），全部内联：混排文本要靠后面的
 * 族兜底缺字。
 */
async function resolveSnapshotFonts(element: HTMLElement, extraText = ''): Promise<LocalFont[]> {
  const families = readCanvasFontFamilies(element).slice(0, MAX_INLINE_FAMILIES);
  if (families.length === 0) {
    return [];
  }

  // 额外字符并进同一份文本：批量导出时各张图文字不同，但并集一致 → 缓存命中同一个子集
  const text = `${element.textContent ?? ''}${extraText}`;
  const cacheKey = `${families.join('|')}\u0000${text}`;
  const cached = snapshotFontCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const fonts: LocalFont[] = [];
  for (const family of families) {
    try {
      // 导入字体（在线/自定义）我们自己有文件，按文件子集化；否则回落到系统字体查询。
      // 注意内联时的族名要用「画布上写的那个」——字体内部的族名可能已被改名或与系统重名
      const imported = findImportedFont(family);
      const font = imported
        ? await platformRuntime.inlineImportedFont(imported.workspace, imported.fileName, text)
        : await platformRuntime.inlineSystemFont(family, text);
      if (!font) {
        continue;
      }

      console.log(
        `[snapshot] 已内联字体 ${family}（子集 ${Math.round(font.data_url.length / 1024)} KB）`,
      );
      fonts.push({ family, src: font.data_url });
    } catch (error) {
      console.warn(`[snapshot] 子集化字体失败（${family}），该族交给通用字体兜底:`, error);
    }
  }

  if (fonts.length === 0) {
    console.warn(`[snapshot] 字体栈无法内联，导出退回通用字体: ${families.join(', ')}`);
    return [];
  }

  snapshotFontCache.set(cacheKey, fonts);
  return fonts;
}

/**
 * 把要内联的字体预先注册进当前文档，并等待解码完成。
 *
 * 快照是在独立的 SVG 图片文档里排版的：WebKit 会先用回退字体算出折行位置，等字体
 * 解码完成只重绘、不重排——于是出现「字形是对的、折行却按更宽的回退字体算」，
 * 表现就是预览一行、导出掉成两行（snapdom 的 `safariWarmupAttempts` 预热解决不了，
 * 实测无效）。先在主文档里把同一份字体数据加载一遍，引擎就带着解码好的字体去排版。
 *
 * 抓完必须卸载：留着会让预览用上「按当时文字生成的子集」，改文案或缺字时出问题。
 */
async function primeSnapshotFonts(fonts: readonly LocalFont[]): Promise<FontFace[]> {
  const primed: FontFace[] = [];

  for (const font of fonts) {
    try {
      const face = new FontFace(font.family, `url(${font.src})`);
      await face.load();
      document.fonts.add(face);
      primed.push(face);
    } catch (error) {
      console.warn(`[snapshot] 字体预热失败（${font.family}），导出可能按回退字体排版:`, error);
    }
  }

  return primed;
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

  let primedFonts: FontFace[] = [];

  try {
    // 字体必须显式内联：snapdom 默认不嵌入字体，快照里的文字会退回到默认字体；
    // 还要先在主文档里预热，否则 WebKit 会按回退字体的宽度排版（见 primeSnapshotFonts）
    const localFonts = await resolveSnapshotFonts(element, context?.extraFontText);
    primedFonts = await primeSnapshotFonts(localFonts);

    const blob = await snapdom.toBlob(element, {
      type: fmt,
      format: fmt,
      quality: preset.quality / 100,
      scale,
      // 固定为 1：输出倍率只能来自用户设置，避免设备 DPI 隐式介入
      dpr: 1,
      backgroundColor: fmt !== 'png' ? '#ffffff' : undefined,
      exclude: options.exclude,
      embedFonts: true,
      localFonts,
    });

    return blobToBytes(blob);
  } finally {
    for (const face of primedFonts) {
      document.fonts.delete(face);
    }
    restoreImages();
  }
}

/**
 * 导出落盘目录：直接取配置里「文件导出目录」（`output.default_path`），导出过程不再弹
 * 保存对话框。
 *
 * 读不到配置（或目录为空）时返回 null，调用方会退回逐张保存对话框兜底；
 * Web 端没有本地目录的概念，同样返回 null（最终退化为浏览器下载）。
 */
export async function resolveExportDirectory(): Promise<string | null> {
  if (!isNativeWindowAvailable()) {
    return null;
  }

  try {
    // 取的是设置 → 导出里的「文件导出目录」（output.default_path），
    // 不是工作区目录（save_directory）
    const config = await getConfig();
    return config.output.default_path?.trim() || null;
  } catch (error) {
    console.warn('读取导出目录失败:', error);
    return null;
  }
}

/**
 * 读取设置里保存的「默认档位」（`output.presets`）。
 *
 * 读不到配置时返回空数组，调用方会退回内置的单个档位。
 */
export async function resolveDefaultOutputPresets(): Promise<OutputPreset[]> {
  try {
    const config = await getConfig();
    return config.output.presets ?? [];
  } catch (error) {
    console.warn('读取默认档位失败:', error);
    return [];
  }
}

/** 读取设置里的常用尺寸（导出面板快捷尺寸下拉的数据源）。 */
export async function resolveExportSizes(): Promise<OutputSize[]> {
  try {
    const config = await getConfig();
    return config.output.sizes ?? [];
  } catch (error) {
    console.warn('读取常用尺寸失败:', error);
    return [];
  }
}

/** 把一组档位写进设置作为「默认档位」，之后新导入的图片会自动套用它。 */
export async function saveDefaultOutputPresets(presets: OutputPreset[]): Promise<void> {
  // 配置是整段读写的：先取回完整配置再只替换 output.presets，
  // 避免把其他设置一起覆盖成旧值
  const config = await getConfig();
  await updateConfig({ ...config, output: { ...config.output, presets } });
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
