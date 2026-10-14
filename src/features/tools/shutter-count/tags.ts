import type { ShutterCountResult } from './provider';

/**
 * ExifTool 的读数口径（原生版与 WASM 版共用，避免两处各写一遍导致结果不一致）。
 */

/**
 * 累计快门数的候选标签。
 *
 * 各厂商把它放在不同位置，按「语义最准确 → 最次」排序：
 * `ShutterCount` 是 Canon/Nikon/Sony/Pentax/Fuji 的通用首选，
 * `ImageNumber` 只在没有别的字段时兜底（有些机型它就是文件序号，未必等于快门数）。
 */
export const COUNT_TAGS = [
  'ShutterCount',
  'ShutterCount2',
  'ShutterCount3',
  'MechanicalShutterCount',
  'ShutterActuations',
  'ImageNumber',
] as const;

/** 一并带回、可能对用户有用的字段。 */
export const EXTRA_TAGS = [
  'Make',
  'Model',
  'SerialNumber',
  'FirmwareVersion',
  'FileNumber',
] as const;

/**
 * 传给 ExifTool 的参数：`-json` 结构化输出、`-n` 数值不做格式化（避免「1,234」这种带千分位的字符串）。
 *
 * 标签名**必须带前导 `-`**：ExifTool 会把不带 `-` 的参数当成文件名，
 * 否则直接报 `File not found - ShutterCount`（这类错误会整条命令失败）。
 */
export const EXIFTOOL_ARGS = [
  '-json',
  '-n',
  ...COUNT_TAGS.map((tag) => `-${tag}`),
  ...EXTRA_TAGS.map((tag) => `-${tag}`),
];

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** 把 ExifTool 的标签表整理成本工具的结果结构。 */
export function buildShutterCountResult(
  tags: Record<string, unknown>,
  provider: { id: string; label: string },
): ShutterCountResult {
  const sourceTag = COUNT_TAGS.find((tag) => toNumber(tags[tag]) !== null) ?? null;
  const extra: Record<string, string | number> = {};

  for (const tag of EXTRA_TAGS) {
    const raw = tags[tag];

    if (typeof raw === 'string' || typeof raw === 'number') {
      extra[tag] = raw;
    }
  }

  return {
    make: toText(tags.Make),
    model: toText(tags.Model),
    shutterCount: sourceTag ? toNumber(tags[sourceTag]) : null,
    sourceTag,
    extra,
    providerId: provider.id,
    providerLabel: provider.label,
  };
}
