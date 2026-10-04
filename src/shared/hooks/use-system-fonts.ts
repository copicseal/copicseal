import { useCallback, useEffect, useRef, useState } from 'react';
import type { FontInfo } from '@/platform';
import { platformRuntime } from '@/platform/providers/platform-runtime';

export interface SystemFontsState {
  fonts: FontInfo[];
  loading: boolean;
  /** 重新枚举系统字体：用户在系统里装了新字体重开应用外也能刷出来 */
  reload: () => void;
}

/** 枚举系统字体。Web 端没有系统字体来源，返回空清单由界面兜底。 */
export function useSystemFonts(): SystemFontsState {
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [loading, setLoading] = useState(false);
  // 只认最后一次请求的结果：连点刷新时先返回的旧清单不该覆盖后返回的新清单
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    requestRef.current += 1;
    const request = requestRef.current;
    setLoading(true);

    try {
      const list = await platformRuntime.listSystemFonts();
      if (request === requestRef.current) {
        setFonts(list);
      }
    } catch (error) {
      console.error('枚举系统字体失败:', error);
    } finally {
      if (request === requestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { fonts, loading, reload: () => void load() };
}
