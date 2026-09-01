import { useEffect, useState } from 'react';
import type { ExifData } from '@/platform';
import { readExifSource } from '@/platform/providers/platform-runtime';
import type { ImportedPhoto } from '@/shared/types/photo';

interface PhotoExifState {
  exif: ExifData | null;
  loading: boolean;
}

/**
 * 会话级 EXIF 缓存：预览水印与右侧 EXIF 信息卡片共用同一份读取结果，
 * 避免对同一张图片重复解析（Web 端 ExifTool WASM 解析开销较大）。
 */
const exifCache = new Map<string, Promise<ExifData | null>>();

function resolveExif(photoId: string, source: string | File): Promise<ExifData | null> {
  const cached = exifCache.get(photoId);
  if (cached) {
    return cached;
  }

  const promise = readExifSource(source).catch((error) => {
    // 读取失败时移除缓存，切换回该图片时允许重试，同时输出日志便于排查。
    console.warn('[exif] 读取失败:', error);
    exifCache.delete(photoId);
    return null;
  });
  exifCache.set(photoId, promise);
  return promise;
}

/** 读取当前图片的 EXIF 信息，含加载状态。 */
export function usePhotoExif(photo: ImportedPhoto | null): PhotoExifState {
  const [state, setState] = useState<PhotoExifState>({ exif: null, loading: false });
  const photoId = photo?.id;
  const source = photo?.sourceFile ?? photo?.path;

  useEffect(() => {
    if (!photoId || source === undefined || source === '') {
      setState({ exif: null, loading: false });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    void resolveExif(photoId, source).then((exif) => {
      if (!cancelled) {
        setState({ exif, loading: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [photoId, source]);

  return state;
}
