import { formatFileSize } from '@/shared/lib/file-size';

export { formatFileSize };

export interface SizeChange {
  /** 压缩率（%）：正数表示省了，负数表示变大 */
  percent: number;
  bigger: boolean;
  /** 省下的字节数（变大时为负数） */
  saved: number;
}

/**
 * 压缩率 =（原始大小 - 输出大小）/ 原始大小 × 100%
 *
 * 输出更大时如实返回负值，不做「强行正向」处理（需求里明确要求正确处理负收益）。
 */
export function sizeChange(originalBytes: number, outputBytes: number): SizeChange {
  if (!originalBytes || originalBytes <= 0) {
    return { percent: 0, bigger: false, saved: 0 };
  }

  const saved = originalBytes - outputBytes;
  return {
    percent: (saved / originalBytes) * 100,
    bigger: saved < 0,
    saved,
  };
}

/** 百分比文案：一位小数，整数时省掉 `.0`。 */
export function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

export function formatDimensions(width: number, height: number): string {
  if (!width || !height) {
    return '';
  }

  return `${width} × ${height}`;
}
