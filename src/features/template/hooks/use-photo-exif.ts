import { useEffect, useState } from 'react';
import type { ExifData } from '@/platform';
import { readExifSource } from '@/platform/providers/platform-runtime';
import type { ImportedPhoto } from '@/shared/types/photo';

interface PhotoExifState {
  exif: ExifData | null;
  loading: boolean;
}

/**
 * EXIF 的读取源。
 *
 * - Web：直接用原始 File（exiftool 支持 HEIC/HIF）；
 * - 桌面：默认读缓存副本，但 HEIC/HIF 的 EXIF 在 ISO-BMFF 容器里，Rust 侧只认 JPEG/TIFF，
 *   所以这类格式改读导入时生成的预览（全分辨率 JPEG，EXIF 完整）。
 */
function resolveExifSource(photo: ImportedPhoto): string | File | undefined {
  if (photo.sourceFile) {
    return photo.sourceFile;
  }

  return photo.isHeic && photo.previewPath ? photo.previewPath : photo.path;
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

/**
 * 按需确保某张照片的 EXIF 已解析完成。
 *
 * 批量导出会连续切换照片，若在 EXIF 就绪前抓图，模板里的机型、光圈、快门
 * 会渲染成空值；因此每张抓图前都要过这一关。结果复用同一份会话缓存。
 */
export function ensurePhotoExif(photo: ImportedPhoto): Promise<ExifData | null> {
  const source = resolveExifSource(photo);
  if (source === undefined || source === '') {
    return Promise.resolve(null);
  }

  return resolveExif(photo.id, source);
}

/** 读取当前图片的 EXIF 信息，含加载状态。 */
export function usePhotoExif(photo: ImportedPhoto | null): PhotoExifState {
  const [state, setState] = useState<PhotoExifState>({ exif: null, loading: false });
  const photoId = photo?.id;
  const source = photo ? resolveExifSource(photo) : undefined;

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
