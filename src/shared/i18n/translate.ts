import { enUS } from './messages/en-US';
import { zhCN } from './messages/zh-CN';
import type { ResolvedLanguage } from './types';

/** 文案字典：以简体中文为「真相来源」，英文必须与它同型。 */
export type Messages = typeof zhCN;

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** 所有可用文案的 key，形如 `collage.toolbar.select`；写错 key 编译不过。 */
export type MessageKey = Leaves<Messages>;

export type TranslateParams = Record<string, string | number>;

const DICTIONARIES: Record<ResolvedLanguage, Messages> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

let currentLanguage: ResolvedLanguage = 'zh-CN';

/** 供非组件代码（工具函数、导出命名等）读取当前语言。 */
export function getCurrentLanguage(): ResolvedLanguage {
  return currentLanguage;
}

export function setCurrentLanguage(language: ResolvedLanguage): void {
  currentLanguage = language;
}

function lookup(language: ResolvedLanguage, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      DICTIONARIES[language],
    );

  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * 取一条文案。
 *
 * 找不到 key 时按「当前语言 → 简中 → key 本身」回落，保证界面上永远有字可显示。
 */
export function translate(
  key: MessageKey,
  params?: TranslateParams,
  language: ResolvedLanguage = currentLanguage,
): string {
  const template = lookup(language, key) ?? lookup('zh-CN', key);

  return template === undefined ? key : interpolate(template, params);
}
