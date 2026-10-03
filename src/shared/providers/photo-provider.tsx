import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { platformRuntime } from '@/platform/providers/platform-runtime';

const { onNativeFileDrop } = platformRuntime;

import { releaseSessionAssets, trackSessionAssets } from '@/platform/services/asset-service';
import {
  type ImportProgressSnapshot,
  importPhotosViaPaths,
  processDroppedFiles,
  selectPhotosFromDirectory,
  selectPhotosViaDialog,
} from '@/shared/lib/import-photo';
import { usePageActive } from '@/shared/providers/page-activity-provider';
import type { ImportedPhoto } from '@/shared/types/photo';

type PhotoImportSource = 'dialog' | 'directory' | 'drop';

interface PhotoImportState {
  active: boolean;
  source: PhotoImportSource | null;
  current: number;
  total: number;
  currentName: string | null;
}

interface PhotoContextValue {
  photos: ImportedPhoto[];
  currentIndex: number;
  currentPhoto: ImportedPhoto | null;
  isDraggingOver: boolean;
  importState: PhotoImportState;
  addPhotos: (photos: ImportedPhoto[]) => void;
  removePhoto: (id: string) => void;
  replacePhoto: (id: string, nextPhoto: ImportedPhoto) => void;
  setCurrentIndex: (index: number) => void;
  importViaDialog: () => Promise<void>;
  importViaDirectory: () => Promise<void>;
  importViaDrop: (files: FileList | File[]) => Promise<void>;
}

export const PhotoContext = createContext<PhotoContextValue | null>(null);

/**
 * 是否暂停「导入完成后自动选中新素材」。
 *
 * 导出期间必须暂停：批量导出自己会逐张切换素材再截图，此时被导入改掉选中，
 * 会有一张截到别的照片——文件名与背景却仍是原来那张，属于静默产出错误内容。
 * 由导出方显式开关，导入侧不猜。
 */
let importSelectionSuspended = false;

export function setImportSelectionSuspended(suspended: boolean): void {
  importSelectionSuspended = suspended;
}

export const PhotoProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const pageActive = usePageActive();
  const sessionId = useId();
  const [photos, setPhotos] = useState<ImportedPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [importState, setImportState] = useState<PhotoImportState>({
    active: false,
    source: null,
    current: 0,
    total: 0,
    currentName: null,
  });

  // 登记当前素材为「正在使用」：设置页清理缓存时据此保留它们的本地副本，
  // 否则内存里的素材会指向已删除的文件（预览空白、导出失败）
  useEffect(() => {
    trackSessionAssets(
      sessionId,
      photos.map((photo) => photo.path),
    );
  }, [photos, sessionId]);

  // 事件回调里读不到最新的 photos（闭包会过期），用 ref 兜住数量
  const photoCountRef = useRef(0);
  useEffect(() => {
    photoCountRef.current = photos.length;
  }, [photos.length]);

  useEffect(() => () => releaseSessionAssets(sessionId), [sessionId]);

  const addPhotos = useCallback((newPhotos: ImportedPhoto[]) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
  }, []);

  const updatePhoto = useCallback((nextPhoto: ImportedPhoto) => {
    setPhotos((prev) =>
      prev.map((photo) => (photo.id === nextPhoto.id ? { ...photo, ...nextPhoto } : photo)),
    );
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const next = prev.filter((p) => p.id !== id);
      if (idx !== -1 && next.length > 0) {
        setCurrentIndex(Math.min(idx, next.length - 1));
      }
      return next;
    });
  }, []);

  const replacePhoto = useCallback((id: string, nextPhoto: ImportedPhoto) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === id
          ? {
              ...nextPhoto,
              id,
            }
          : photo,
      ),
    );
  }, []);

  // 导入开始时已有多少张素材，导入结束按它切到新素材的第一张
  const importStartIndexRef = useRef(0);

  const startImport = useCallback((source: PhotoImportSource) => {
    // 新素材一律接在列表末尾：记下开始时的数量，导入结束就能定位第一张新素材。
    // 列表只追加不重排，所以这个下标在导入结束后依然有效。
    importStartIndexRef.current = photoCountRef.current;
    setImportState({
      active: true,
      source,
      current: 0,
      total: 0,
      currentName: null,
    });
  }, []);

  const updateImportProgress = useCallback(
    (source: PhotoImportSource, progress: ImportProgressSnapshot) => {
      setImportState({
        active: progress.current < progress.total,
        source,
        current: progress.current,
        total: progress.total,
        currentName: progress.currentName ?? null,
      });
    },
    [],
  );

  const finishImport = useCallback((source: PhotoImportSource) => {
    setImportState((prev) => ({
      active: false,
      source,
      current: prev.current,
      total: prev.total,
      currentName: prev.currentName,
    }));
  }, []);

  /**
   * 导入收尾：结束进度提示，并把选中切到这一轮新素材的第一张。
   *
   * 导入完通常马上要调这张的模板/排版，停在旧素材上还得自己再点一次；
   * 一张都没进来（全部失败或用户取消）时保持当前选中不变。
   */
  const selectImported = useCallback(
    (source: PhotoImportSource, imported: ImportedPhoto[]) => {
      finishImport(source);

      if (imported.length > 0 && !importSelectionSuspended) {
        setCurrentIndex(importStartIndexRef.current);
      }
    },
    [finishImport],
  );

  const importViaDialog = useCallback(async () => {
    startImport('dialog');
    const result = await selectPhotosViaDialog({
      onProgress: (progress) => updateImportProgress('dialog', progress),
      onPhotoImported: (photo) => addPhotos([photo]),
      onPhotoUpdated: updatePhoto,
    });
    selectImported('dialog', result);
  }, [addPhotos, selectImported, startImport, updateImportProgress, updatePhoto]);

  const importViaDirectory = useCallback(async () => {
    startImport('directory');
    const result = await selectPhotosFromDirectory({
      onProgress: (progress) => updateImportProgress('directory', progress),
      onPhotoImported: (photo) => addPhotos([photo]),
      onPhotoUpdated: updatePhoto,
    });
    selectImported('directory', result);
  }, [addPhotos, selectImported, startImport, updateImportProgress, updatePhoto]);

  const importViaDrop = useCallback(
    async (files: FileList | File[]) => {
      startImport('drop');
      const result = await processDroppedFiles(files, {
        onProgress: (progress) => updateImportProgress('drop', progress),
        onPhotoImported: (photo) => addPhotos([photo]),
        onPhotoUpdated: updatePhoto,
      });
      selectImported('drop', result);
    },
    [addPhotos, selectImported, startImport, updateImportProgress, updatePhoto],
  );

  useEffect(() => {
    // 隐藏页不再监听原生拖放：页面常驻挂载后，否则两个功能页会同时响应同一次拖入。
    if (!pageActive) {
      setIsDraggingOver(false);
      return;
    }

    let cleanup: (() => void) | undefined;

    try {
      const unlisten = onNativeFileDrop(async (event) => {
        switch (event.payload.type) {
          case 'enter':
            setIsDraggingOver(true);
            break;
          case 'leave':
            setIsDraggingOver(false);
            break;
          case 'drop': {
            setIsDraggingOver(false);
            startImport('drop');
            const result = await importPhotosViaPaths(event.payload.paths, {
              onProgress: (progress) => updateImportProgress('drop', progress),
              onPhotoImported: (photo) => addPhotos([photo]),
              onPhotoUpdated: updatePhoto,
            });
            selectImported('drop', result);
            break;
          }
        }
      });

      cleanup = () => {
        unlisten.then((fn) => fn());
      };
    } catch {
      cleanup = undefined;
    }

    return () => {
      cleanup?.();
    };
  }, [addPhotos, pageActive, selectImported, startImport, updateImportProgress, updatePhoto]);

  const currentPhoto = photos[currentIndex] ?? null;

  return (
    <PhotoContext.Provider
      value={{
        photos,
        currentIndex,
        currentPhoto,
        isDraggingOver,
        importState,
        addPhotos,
        removePhoto,
        replacePhoto,
        setCurrentIndex,
        importViaDialog,
        importViaDirectory,
        importViaDrop,
      }}
    >
      {children}
    </PhotoContext.Provider>
  );
};
