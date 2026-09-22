import { useEffect, useState } from 'react';
import type { ImportedPhoto } from '@/shared/types/photo';
import { readPhotoPalette } from '../lib/photo-palette';

export interface PhotoPaletteState {
  /** 按占比从高到低排列的主题色 */
  colors: string[];
  loading: boolean;
  /** 提取失败（读取或解码出错），面板会退化成只剩手动取色 */
  failed: boolean;
}

/**
 * 会话级主题色缓存：同一张照片只用采样一次。
 *
 * 键是预览资源本身而不是照片 ID：主题色来自实际用于显示的那些像素，
 * 资源换了就必须重新提取。
 */
const paletteCache = new Map<string, Promise<string[]>>();

function resolvePalette(src: string): Promise<string[]> {
  const cached = paletteCache.get(src);
  if (cached) {
    return cached;
  }

  const promise = readPhotoPalette(src).catch((error) => {
    // 失败时移除缓存，切回该图片或重新导入后允许重试，同时留下日志便于排查
    console.warn('[palette] 主题色提取失败:', error);
    paletteCache.delete(src);
    return [];
  });
  paletteCache.set(src, promise);
  return promise;
}

/** 读取当前照片的主题色，含加载与失败状态。 */
export function usePhotoPalette(photo: ImportedPhoto | null): PhotoPaletteState {
  const [state, setState] = useState<PhotoPaletteState>({
    colors: [],
    loading: false,
    failed: false,
  });
  const src = photo?.previewUrl;

  useEffect(() => {
    if (!src) {
      setState({ colors: [], loading: false, failed: false });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    void resolvePalette(src).then((colors) => {
      if (cancelled) {
        return;
      }

      setState({ colors, loading: false, failed: colors.length === 0 });
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return state;
}
