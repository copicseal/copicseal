export interface ImportProgressSnapshot {
  current: number;
  total: number;
  currentName?: string;
}

/**
 * 单张素材导入失败。
 *
 * 批量导入按张隔离：失败的一张只记在这里（并提示用户），不打断其余文件的导入，
 * 因此批量导入的返回值里不会出现它。
 */
export interface ImportFailure {
  /** 文件名（含扩展名） */
  name: string;
  /** 失败原因：后端返回的可读文案，或前端归一化后的错误文本 */
  reason: string;
}
