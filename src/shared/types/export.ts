export type ExportFormat = 'jpeg' | 'png' | 'webp';

export interface ExportOptions {
  format: ExportFormat;
  width?: number;
  height?: number;
  scale: number;
  quality: number;
  dpi: number;
  preserveExif: boolean;
  exclude?: string[];
}
