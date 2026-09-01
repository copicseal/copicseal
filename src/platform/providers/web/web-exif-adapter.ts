// 经由包 exports 暴露的 "./zeroperl.wasm" 子路径解析 WASM 资产（深层 dist 路径未导出，无法直接导入）。
import zeroperlWasmUrl from '@6over3/zeroperl-ts/zeroperl.wasm?url';
import { type ExifTags, parseMetadata, writeMetadata } from '@uswriting/exiftool';
import type { ExifData } from '@/platform/contracts';

type RawMetadata = Record<string, unknown>;

/**
 * zeroperl 在浏览器中以页面相对路径 `fetch("./zeroperl.wasm")` 加载 WASM 引擎，
 * 该路径在 Vite（dev 与 build）下并不存在，会导致 WASM 初始化失败、EXIF 永远读取不到。
 * 这里把请求重定向到由 Vite 资源管线处理的 `?url` 资产地址。
 */
function wasmFetch(input: unknown, init?: unknown): Promise<Response> {
  const url =
    typeof input === 'string' && input.endsWith('zeroperl.wasm')
      ? zeroperlWasmUrl
      : (input as string | URL | Request);
  return fetch(url, init as RequestInit | undefined);
}

/** 只解析 EXIF 组，避免把 SourceFile/FileSize 等系统标签混入结果或写回导出文件。 */
const EXIF_ARGS = ['-json', '-n', '-exif:all'];

function firstMetadataValue(metadata: RawMetadata, ...keys: string[]): unknown {
  return keys.map((key) => metadata[key]).find((value) => value !== undefined && value !== null);
}

function asString(value: unknown): string | null {
  return value === undefined || value === null ? null : String(value);
}

function asNumber(value: unknown): number | null {
  const result = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(result) ? result : null;
}

/** 以下格式化函数与 Rust 后端 exif.rs 的展示格式保持一致，保证双端渲染一致。 */
function formatAperture(value: unknown): string | null {
  const fnumber = asNumber(value);
  return fnumber === null ? null : `f/${fnumber.toFixed(1)}`;
}

function formatShutter(value: unknown): string | null {
  const seconds = asNumber(value);
  if (seconds === null) return null;
  if (seconds >= 1) return `${seconds.toFixed(0)}s`;
  if (seconds > 0) return `1/${Math.round(1 / seconds)}s`;
  return '0s';
}

function formatFocalLength(value: unknown): string | null {
  const mm = asNumber(value);
  return mm === null ? null : `${mm.toFixed(0)}mm`;
}

function formatExposureCompensation(value: unknown): string | null {
  const ev = asNumber(value);
  if (ev === null) return null;
  if (ev === 0) return '0 EV';
  return `${ev > 0 ? '+' : ''}${ev.toFixed(1)} EV`;
}

const WHITE_BALANCE_LABELS: Record<string, string> = {
  0: 'Auto',
  1: 'Manual',
};

const METERING_MODE_LABELS: Record<string, string> = {
  0: 'Unknown',
  1: 'Average',
  2: 'Center-weighted average',
  3: 'Spot',
  4: 'Multi-spot',
  5: 'Multi-segment',
  6: 'Partial',
  255: 'Other',
};

function formatEnumLabel(value: unknown, labels: Record<string, string>): string | null {
  if (value === undefined || value === null) return null;
  return labels[String(value)] ?? String(value);
}

/** 回写时必须剔除的只读伪标签，否则 ExifTool 会在 stderr 报警导致写入被判为失败。 */
const NON_WRITABLE_TAG_KEYS = new Set(['SourceFile', 'Error', 'Warning']);

export class WebExifAdapter {
  async read(file: File): Promise<ExifData> {
    const result = await parseMetadata<RawMetadata>(file, {
      args: EXIF_ARGS,
      fetch: wasmFetch,
      transform: (value) => JSON.parse(value) as RawMetadata,
    });
    if (!result.success) throw new Error(result.error);
    const metadata = Array.isArray(result.data) ? result.data[0] : result.data;
    return {
      make: asString(firstMetadataValue(metadata, 'Make')),
      model: asString(firstMetadataValue(metadata, 'Model')),
      lens_model: asString(firstMetadataValue(metadata, 'LensModel', 'LensID')),
      aperture: formatAperture(firstMetadataValue(metadata, 'FNumber', 'Aperture')),
      shutter_speed: formatShutter(firstMetadataValue(metadata, 'ExposureTime', 'ShutterSpeed')),
      iso: asString(firstMetadataValue(metadata, 'ISO')),
      focal_length: formatFocalLength(firstMetadataValue(metadata, 'FocalLength')),
      exposure_compensation: formatExposureCompensation(
        firstMetadataValue(metadata, 'ExposureCompensation', 'ExposureBiasValue'),
      ),
      date_taken: asString(firstMetadataValue(metadata, 'DateTimeOriginal', 'CreateDate')),
      white_balance: formatEnumLabel(
        firstMetadataValue(metadata, 'WhiteBalance'),
        WHITE_BALANCE_LABELS,
      ),
      metering_mode: formatEnumLabel(
        firstMetadataValue(metadata, 'MeteringMode'),
        METERING_MODE_LABELS,
      ),
      latitude: asNumber(firstMetadataValue(metadata, 'GPSLatitude')),
      longitude: asNumber(firstMetadataValue(metadata, 'GPSLongitude')),
      image_width: asNumber(
        firstMetadataValue(metadata, 'ExifImageWidth', 'ImageWidth', 'ImageWidthSensor'),
      ),
      image_height: asNumber(
        firstMetadataValue(metadata, 'ExifImageHeight', 'ImageHeight', 'ImageHeightSensor'),
      ),
    };
  }

  async copyMetadata(source: File, output: Uint8Array, outputName: string): Promise<Uint8Array> {
    const result = await parseMetadata<RawMetadata>(source, {
      args: EXIF_ARGS,
      fetch: wasmFetch,
      transform: (value) => JSON.parse(value) as RawMetadata,
    });
    if (!result.success) throw new Error(result.error);
    const raw = Array.isArray(result.data) ? result.data[0] : result.data;
    const metadata: ExifTags = {};
    for (const [key, value] of Object.entries(raw)) {
      if (NON_WRITABLE_TAG_KEYS.has(key)) continue;
      metadata[key] = value as ExifTags[string];
    }
    // 新版 TS lib 要求 BlobPart 的 ArrayBufferView 以纯 ArrayBuffer 为背景，
    // 复制一份以兼容 ArrayBufferLike 背景的 Uint8Array 入参。
    const outputPart = new Uint8Array(output);
    const written = await writeMetadata(
      new File([outputPart], outputName, { type: 'image/jpeg' }),
      metadata,
      { fetch: wasmFetch },
    );
    if (!written.success) throw new Error(written.error);
    return new Uint8Array(written.data);
  }
}

export const webExifAdapter = new WebExifAdapter();
