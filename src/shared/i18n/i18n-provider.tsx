import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { type MessageKey, setCurrentLanguage, type TranslateParams, translate } from './translate';
import { DEFAULT_LANGUAGE, type Language, type ResolvedLanguage, resolveLanguage } from './types';

type I18nContextValue = {
  /** 语言偏好，可能是 `system` */
  language: Language;
  /** 实际生效的语言，永远不是 `system` */
  resolved: ResolvedLanguage;
  /** 取文案；key 由字典推导，写错编译不过 */
  t: (key: MessageKey, params?: TranslateParams) => string;
  /** 只切当前会话（立即生效）；持久化由调用方负责（设置页写配置） */
  setLanguage: (language: Language) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const resolved = useMemo(() => resolveLanguage(language), [language]);

  // 启动时读一次持久化配置：读不到（Web 端、首次运行）就按系统语言
  useEffect(() => {
    let cancelled = false;

    void platformRuntime
      .getConfig()
      .then((config) => {
        if (!cancelled && config?.language) {
          setLanguageState(config.language as Language);
        }
      })
      .catch((error) => {
        console.warn('读取语言配置失败:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 非组件代码（工具函数、导出命名）也要按当前语言出文案
  useEffect(() => {
    setCurrentLanguage(resolved);
    document.documentElement.lang = resolved;
  }, [resolved]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: TranslateParams) => translate(key, params, resolved),
    [resolved],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, resolved, t, setLanguage }),
    [language, resolved, t, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n 必须在 I18nProvider 内使用');
  }

  return context;
}

/** 只需要取文案时的简写。 */
export function useTranslate() {
  return useI18n().t;
}

export { useI18n as useTranslation };
