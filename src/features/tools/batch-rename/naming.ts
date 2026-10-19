import type { DirectoryEntry, RenamePreset, RenameSortBy } from '@/platform/contracts';
import type { MessageKey } from '@/shared/i18n';

/**
 * 批量改文件名的「规则」部分：内置预设、模板渲染、预览表。
 *
 * 这里只做纯计算（不碰文件系统）：真正的排序、冲突校验与改名在 Rust 侧
 * （`src-tauri/src/rename.rs`），所以同样的输入能得到同样的结果，但以 Rust 的判断为准。
 */

/**
 * 规则里的模板变量。
 *
 * 序号有三种写法：
 * - `{n}`：位数用界面上的「位数」字段
 * - `{n:3}` / `{n:03}`：冒号后是**最小位数**（最主流的写法，前导零按 C 习惯可忽略）
 * - `{00n}`：所见即所得，写几个 0 就是几位（`{00n}` → `001`）
 */
export const PATTERN_TOKENS = ['{n}', '{n:3}', '{00n}', '{name}', '{date}', '{time}'] as const;

/** 一条内置规则：内置只读，用户不能改也不能删（自定义规则另存进 `config.rename.presets`）。 */
export interface BuiltinPreset {
  id: string;
  labelKey: MessageKey;
  pattern: string;
  start: number;
  padding: number;
  /** 选中这条规则时顺手建议的排序依据 */
  sortBy: RenameSortBy;
}

/**
 * 常见命名规则。
 *
 * 顺序按「最常用 → 需要更多信息」排：纯序号最通用，日期类依赖 EXIF 拍摄时间。
 */
export const BUILTIN_PRESETS: readonly BuiltinPreset[] = [
  {
    id: 'sequence',
    labelKey: 'common.tools.batchRename.preset.sequence',
    pattern: '{n}',
    start: 1,
    padding: 1,
    sortBy: 'name',
  },
  {
    id: 'folder-style',
    labelKey: 'common.tools.batchRename.preset.folderStyle',
    pattern: 'IMG_{n}',
    start: 1,
    padding: 3,
    sortBy: 'name',
  },
  {
    id: 'camera-style',
    labelKey: 'common.tools.batchRename.preset.cameraStyle',
    pattern: 'DSC_{n}',
    start: 1,
    padding: 4,
    sortBy: 'taken',
  },
  {
    id: 'date-sequence',
    labelKey: 'common.tools.batchRename.preset.dateSequence',
    pattern: '{date}_{n}',
    start: 1,
    padding: 3,
    sortBy: 'taken',
  },
  {
    id: 'datetime-sequence',
    labelKey: 'common.tools.batchRename.preset.datetimeSequence',
    pattern: '{date}_{time}_{n}',
    start: 1,
    padding: 1,
    sortBy: 'taken',
  },
  {
    id: 'keep-name',
    labelKey: 'common.tools.batchRename.preset.keepName',
    pattern: '{name}_{n}',
    start: 1,
    padding: 2,
    sortBy: 'name',
  },
];

/** 渲染模板需要的一轮上下文。 */
export interface PatternContext {
  /** 序号（从 `start` 开始） */
  index: number;
  /** 补零位数 */
  padding: number;
  /** 原文件名（不含扩展名） */
  stem: string;
  /** `YYYYMMDD` */
  date: string;
  /** `HHMMSS` */
  time: string;
}

function pad(value: number, width: number): string {
  return String(value).padStart(Math.max(width, 1), '0');
}

/** 序号位数上限：防止误输入（比如把 `{n:99}` 当成占位符）。 */
function clampWidth(width: number): number {
  return Math.min(12, Math.max(1, Math.trunc(width)));
}

/**
 * 把模板渲染成文件名（不含扩展名）。未知变量原样保留，便于用户看出写错了。
 *
 * 序号支持 `{n}`（用界面上的位数）、`{n:3}`（最小位数）、`{00n}`（写几个 0 就是几位）。
 */
export function renderPattern(pattern: string, context: PatternContext): string {
  return (
    pattern
      // `{n:3}` / `{n:03}`
      .replace(/\{n:(\d{1,2})\}/g, (_match, raw: string) =>
        pad(context.index, clampWidth(Number(raw))),
      )
      // `{n}` / `{0n}` / `{00n}` …（写几个 0 就是几位；上限 8 个 0）
      .replace(/\{(0{0,8})n\}/g, (_match, zeros: string) =>
        pad(context.index, clampWidth(zeros.length > 0 ? zeros.length + 1 : context.padding)),
      )
      .replace(/\{name\}/g, () => context.stem)
      .replace(/\{date\}/g, () => context.date)
      .replace(/\{time\}/g, () => context.time)
  );
}

/**
 * 取一个文件用于 `{date}` / `{time}` 的时间。
 *
 * 优先 EXIF 拍摄时间（Rust 已规范成 `YYYYMMDDHHMMSS`）；
 * 没有就退回**修改时间**（在浏览器里按**本地时区**格式化，所以没有时区偏移问题）。
 */
export function dateTimeOf(entry: DirectoryEntry): {
  date: string;
  time: string;
  fromExif: boolean;
} {
  if (entry.taken_at && entry.taken_at.length >= 14) {
    return {
      date: entry.taken_at.slice(0, 8),
      time: entry.taken_at.slice(8, 14),
      fromExif: true,
    };
  }

  if (entry.modified_ms !== null) {
    const date = new Date(entry.modified_ms);
    const parts = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((value) =>
      pad(value, 2),
    );
    const timeParts = [date.getHours(), date.getMinutes(), date.getSeconds()].map((value) =>
      pad(value, 2),
    );

    return { date: parts.join(''), time: timeParts.join(''), fromExif: false };
  }

  return { date: '', time: '', fromExif: false };
}

/** 预览里的一行。 */
export interface PreviewRow {
  entry: DirectoryEntry;
  /** 新文件名（含扩展名）；手动改过时是改后的值 */
  target: string;
  /** 规则本来会生成的名字（手动改为「恢复」时用） */
  generated: string;
  /** 这一行是否被手动改过 */
  edited: boolean;
  /** 预览阶段能看出来的问题；最终以 Rust 校验为准 */
  conflict: string | null;
  /** `{date}` / `{time}` 是否退回了修改时间 */
  usedFallbackTime: boolean;
}

export interface BuildPreviewOptions {
  pattern: string;
  start: number;
  padding: number;
  /**
   * 目标位置已经存在的文件名（小写）。
   *
   * 复制模式下列出目标目录里现有的名字，预览就能提前标出「会覆盖已有文件」；
   * 改名模式不传——那种情况下目标落在源集合里属于合法的环，由 Rust 的
   * `find_conflicts` 区分「集合内」与「集合外占用」。
   */
  reserved?: ReadonlySet<string>;
  /**
   * 手动改过的文件名（键是原文件名，值是完整新名）。
   *
   * 有手动值时以它为准，规则只作为默认值；键用**原文件名**而不是行号，
   * 这样改排序、筛扩展名、套别的规则都不会丢。
   */
  overrides?: ReadonlyMap<string, string>;
}

/**
 * 生成预览：按已排好的顺序逐个套模板。
 *
 * 冲突这里只查「目标重复」「非法目标名」与（复制模式下）「目标已存在」；
 * 其余占用情况由 Rust 侧统一校验（有冲突时它一条都不写）。
 */
export function buildPreview(
  entries: readonly DirectoryEntry[],
  options: BuildPreviewOptions,
): PreviewRow[] {
  const used = new Map<string, number>();
  const rows: PreviewRow[] = [];

  entries.forEach((entry, offset) => {
    const { date, time, fromExif } = dateTimeOf(entry);
    const rendered = renderPattern(options.pattern, {
      index: options.start + offset,
      padding: options.padding,
      stem: entry.stem,
      date,
      time,
    });
    const generated = entry.ext ? `${rendered}.${entry.ext}` : rendered;
    // 手动编辑优先；冲突判定对最终名字做，所以手改出的重名/非法名也会被拦下
    const edited = options.overrides?.get(entry.name);
    const target = edited ?? generated;
    const key = target.toLowerCase();
    const seen = used.get(key);

    let conflict: string | null = null;

    if (!target.trim()) {
      conflict = 'empty';
    } else if (target.includes('/') || target.includes('\\')) {
      conflict = 'separator';
    } else if (seen !== undefined) {
      conflict = 'duplicate';
    } else if (options.reserved?.has(key)) {
      conflict = 'taken';
    }

    used.set(key, offset);
    rows.push({
      entry,
      target,
      generated,
      edited: edited !== undefined,
      conflict,
      usedFallbackTime: !fromExif,
    });
  });

  return rows;
}

/** 把用户保存的规则转成预览/执行用的形状（与内置规则共用一套字段）。 */
export function presetValues(preset: RenamePreset): BuildPreviewOptions {
  return { pattern: preset.pattern, start: preset.start, padding: preset.padding };
}
