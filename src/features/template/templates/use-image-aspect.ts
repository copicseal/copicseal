import type { SyntheticEvent } from 'react';
import { useState } from 'react';

/**
 * 读取图片真实长宽比。
 *
 * 记录的是「哪张图读出了什么比例」，因此 src 变化时自动回退到 `fallback`，
 * 不需要额外的重置副作用；同时保证首帧就有确定高度，探针测量不会拿到 0。
 */
export function useImageAspect(src: string, fallback = 1.5) {
  const [loaded, setLoaded] = useState<{ src: string; aspect: number } | null>(null);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalHeight > 0) {
      setLoaded({ src, aspect: naturalWidth / naturalHeight });
    }
  };

  return {
    aspect: loaded?.src === src ? loaded.aspect : fallback,
    handleLoad,
  };
}
