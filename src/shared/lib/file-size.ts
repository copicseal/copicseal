/**
 * 文件体积格式化。
 *
 * 一律按 MB 显示时，几十 KB 的素材会被四舍五入成「0.0 MB」（模板页、拼图素材栏都踩过），
 * 所以这里按量级换单位：< 1 MB 用 KB，< 1 KB 用 B。`0`/空值返回空串，方便调用方
 * 直接把它塞进 `[...].filter(Boolean).join(' · ')` 这类拼接里。
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) {
    return '';
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}
