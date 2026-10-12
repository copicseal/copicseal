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
  /** 失败原因：后端返回的可读文案，或前端归一化后的错误文本（已剥掉错误码标记） */
  reason: string;
  /**
   * 机器可读的错误码，来自后端错误串里的 `[[co:…]]` 标记。
   *
   * 界面据此决定要不要给补救入口（例如 `heic-decoder-missing` → 「去安装插件」按钮），
   * 而不是去匹配文案。
   */
  code: string | null;
}
