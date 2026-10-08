/** 语言偏好：除具体语言外还能选「跟随系统」。 */
export type Language = 'system' | 'zh-CN' | 'en-US';

/** 解析后的实际语言（一定不是 system）。 */
export type ResolvedLanguage = 'zh-CN' | 'en-US';

export const DEFAULT_LANGUAGE: Language = 'system';

export const RESOLVED_LANGUAGES: ResolvedLanguage[] = ['zh-CN', 'en-US'];

/** 语言下拉的取值；语言名各用自己的写法（业界惯例），只有「跟随系统」需要翻译。 */
export const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'system', label: '' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
];

/** 把语言偏好解析成实际语言：system 时按浏览器/系统语言猜，认不出就回落简中。 */
export function resolveLanguage(
  language: Language | string | undefined,
  systemLanguage?: string,
): ResolvedLanguage {
  if (language === 'zh-CN' || language === 'en-US') {
    return language;
  }

  const system =
    systemLanguage ?? (typeof navigator === 'undefined' ? undefined : navigator.language);
  const normalized = system?.toLowerCase() ?? '';

  if (normalized.startsWith('zh')) {
    return 'zh-CN';
  }

  // 只有认得出英文才切英文，其余语言一律回落简中
  return normalized.startsWith('en') ? 'en-US' : 'zh-CN';
}
