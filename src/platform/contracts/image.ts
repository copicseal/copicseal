export type { ExportFormat, ExportOptions } from '@/shared/types/export';
export type { ExifData } from './index';

export interface ImageResult {
  data: Blob | Uint8Array;
  mimeType: string;
  meta: { provider: string; durationMs: number; fallbackFrom?: string[] };
}
