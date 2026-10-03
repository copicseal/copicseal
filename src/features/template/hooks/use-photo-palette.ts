import { useEffect, useState } from 'react';
import type { ImportedPhoto } from '@/shared/types/photo';
import { readPhotoPalette } from '../lib/photo-palette';

export interface PhotoPaletteState {
  /** 主题色所属的图片资源；与当前图片不同说明这张还在采样 */
  src: string | null;
  /** 按占比从高到低排列的主题色 */
  colors: string[];
  loading: boolean;
  /** 提取失败（读取或解码出错），面板会退化成只剩手动取色 */
  failed: boolean;
}

/** 空态用的同一个数组：换图期间每帧都返回新数组会让下游依赖无谓地失效 */
const NO_COLORS: string[] = [];

/** 无照片时的空态。 */
const EMPTY_PALETTE: Omit<PhotoPaletteState, 'src'> = {
  colors: NO_COLORS,
  loading: false,
  failed: false,
};

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
    src: null,
    ...EMPTY_PALETTE,
  });
  const src = photo?.previewUrl ?? null;

  useEffect(() => {
    if (!src) {
      setState({ src: null, ...EMPTY_PALETTE });
      return;
    }

    let cancelled = false;
    // 换图先清空：旧颜色留着只会被当成新图的主题色
    setState({ src, colors: NO_COLORS, loading: true, failed: false });

    void resolvePalette(src).then((colors) => {
      if (cancelled) {
        return;
      }

      setState({ src, colors, loading: false, failed: colors.length === 0 });
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  // state 是异步跟上的：换图后的第一次渲染里它还揣着上一张的颜色，而 effect 要等本次
  // 提交结束才跑，所以调用方在这一帧读到的仍然是旧值。对不上就按空处理，宁可晚一帧出
  // 颜色，也不能把上一张的主题色套到这一张上。
  if (state.src !== src) {
    return { src, colors: NO_COLORS, loading: src !== null, failed: false };
  }

  return state;
}
