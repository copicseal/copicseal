// zeroperl 的 WASM 资产地址与请求重定向：与 web 端 EXIF 适配器共用一份（见该模块注释）
import { fetchZeroperlWasm as fetchForExiftool } from '@/shared/lib/zeroperl-wasm';
import {
  registerShutterCountProvider,
  type ShutterCountProvider,
  type ShutterCountResult,
} from '../provider';

/**
 * 累计快门数的候选标签。
 *
 * 各厂商把它放在不同位置，按「语义最准确 → 最次」排序：
 * `ShutterCount` 是 Canon/Nikon/Sony/Pentax/Fuji 的通用首选，
 * `ImageNumber` 只在没有别的字段时兜底（有些机型它就是文件序号，未必等于快门数）。
 */
const COUNT_TAGS = [
  'ShutterCount',
  'ShutterCount2',
  'ShutterCount3',
  'MechanicalShutterCount',
  'ShutterActuations',
  'ImageNumber',
] as const;

/** 一并带回、可能对用户有用的字段。 */
const EXTRA_TAGS = ['Make', 'Model', 'SerialNumber', 'FirmwareVersion', 'FileNumber'] as const;

/**
 * 传给 ExifTool 的参数：`-json` 结构化输出、`-n` 数值不做格式化（避免「1,234」这种带千分位的字符串）。
 *
 * 标签名**必须带前导 `-`**：ExifTool 会把不带 `-` 的参数当成文件名，
 * 否则直接报 `File not found - ShutterCount`（这类错误会整条命令失败）。
 */
const EXIFTOOL_ARGS = [
  '-json',
  '-n',
  ...COUNT_TAGS.map((tag) => `-${tag}`),
  ...EXTRA_TAGS.map((tag) => `-${tag}`),
];

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * ExifTool(WASM) 实现。
 *
 * ExifTool 与它 24 MB 的 WASM 运行时**只在这个模块被调用时**才加载：
 * 面板打开功能列表不会碰到它，工具第一次读取时才付这份代价。
 */
const exiftoolWasmProvider: ShutterCountProvider = {
  id: 'wasm-exiftool',
  label: 'ExifTool (WASM)',

  isAvailable: async () => true,

  async read({ bytes, fileName }): Promise<ShutterCountResult> {
    const { parseMetadata } = await import('@uswriting/exiftool');

    const output = await parseMetadata(
      { name: fileName, data: bytes },
      {
        args: EXIFTOOL_ARGS,
        transform: (data: string) => JSON.parse(data) as Array<Record<string, unknown>>,
        fetch: fetchForExiftool,
      },
    );

    if (!output.success) {
      throw new Error(output.error || 'ExifTool 解析失败');
    }

    const tags = Array.isArray(output.data) ? (output.data[0] ?? {}) : {};
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
      providerId: exiftoolWasmProvider.id,
      providerLabel: exiftoolWasmProvider.label,
    };
  },
};

registerShutterCountProvider(exiftoolWasmProvider);
