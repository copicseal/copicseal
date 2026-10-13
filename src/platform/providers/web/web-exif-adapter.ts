import { type ExifTags, parseMetadata, writeMetadata } from '@uswriting/exiftool';
import type { ExifData } from '@/platform/contracts';
// zeroperl 的 WASM 资产地址与请求重定向与「更多功能 → 快门数查询」共用一份（见该模块注释）
import { fetchZeroperlWasm as wasmFetch } from '@/shared/lib/zeroperl-wasm';

type RawMetadata = Record<string, unknown>;

/** 只解析 EXIF 组，避免把 SourceFile/FileSize 等系统标签混入结果或写回导出文件。 */
const EXIF_ARGS = ['-json', '-n', '-exif:all'];

function firstMetadataValue(metadata: RawMetadata, ...keys: string[]): unknown {
  return keys.map((key) => metadata[key]).find((value) => value !== undefined && value !== null);
}

function asString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  // EXIF 里的文本字段常带尾随空格，这里与 Rust 侧保持一致地去掉首尾空白
  const text = String(value).trim();
  return text === '' ? null : text;
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

/** 读出 JPEG 的实际像素尺寸（SOF 帧头），与 Rust 侧 `jpeg_frame_size` 同一套解析。 */
function jpegFrameSize(data: Uint8Array): { width: number; height: number } | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;

  let pos = 2;
  while (pos + 3 < data.length) {
    if (data[pos] !== 0xff) return null;
    const marker = data[pos + 1];
    if (marker === 0xff) {
      pos += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) return null;

    const length = (data[pos + 2] << 8) | data[pos + 3];
    if (length < 2 || pos + 2 + length > data.length) return null;

    const isFrameHeader =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameHeader) {
      const height = (data[pos + 5] << 8) | data[pos + 6];
      const width = (data[pos + 7] << 8) | data[pos + 8];
      return { width, height };
    }

    pos += 2 + length;
  }

  return null;
}

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
      orientation: asNumber(firstMetadataValue(metadata, 'Orientation')),
      exposure_program: asNumber(firstMetadataValue(metadata, 'ExposureProgram')),
      flash: asNumber(firstMetadataValue(metadata, 'Flash')),
      focal_length_35mm: asNumber(
        firstMetadataValue(metadata, 'FocalLengthIn35mmFormat', 'FocalLengthIn35mmFilm'),
      ),
      // exiftool 对 MaxApertureValue 已经做过 ValueConv，`-n` 拿到的是 f 值而不是 APEX，
      // 这里不能再按 2^(apex/2) 换算（会双重换算）。Rust 侧用的是原始 APEX，那里才需要换算。
      max_aperture: formatAperture(firstMetadataValue(metadata, 'MaxApertureValue')),
      software: asString(firstMetadataValue(metadata, 'Software')),
      artist: asString(firstMetadataValue(metadata, 'Artist')),
      copyright: asString(firstMetadataValue(metadata, 'Copyright')),
      body_serial: asString(firstMetadataValue(metadata, 'BodySerialNumber', 'SerialNumber')),
      lens_serial: asString(firstMetadataValue(metadata, 'LensSerialNumber')),
      gps_altitude: asNumber(firstMetadataValue(metadata, 'GPSAltitude')),
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
    // 与桌面端一致：原图的尺寸/朝向对不上导出画面，写回前先按实际像素纠正
    const frame = jpegFrameSize(outputPart);
    if (frame) {
      metadata.ExifImageWidth = frame.width;
      metadata.ExifImageHeight = frame.height;
    }
    metadata.Orientation = 1;
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
