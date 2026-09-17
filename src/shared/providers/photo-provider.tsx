import { createContext, type FC, type ReactNode, useCallback, useEffect, useState } from 'react';
import { platformRuntime } from '@/platform/providers/platform-runtime';

const { onNativeFileDrop } = platformRuntime;

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

export const PhotoProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const pageActive = usePageActive();
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

  const startImport = useCallback((source: PhotoImportSource) => {
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

  const importViaDialog = useCallback(async () => {
    startImport('dialog');
    const result = await selectPhotosViaDialog({
      onProgress: (progress) => updateImportProgress('dialog', progress),
      onPhotoImported: (photo) => addPhotos([photo]),
      onPhotoUpdated: updatePhoto,
    });
    if (!result.length) {
      finishImport('dialog');
      return;
    }
    finishImport('dialog');
  }, [addPhotos, finishImport, startImport, updateImportProgress, updatePhoto]);

  const importViaDirectory = useCallback(async () => {
    startImport('directory');
    const result = await selectPhotosFromDirectory({
      onProgress: (progress) => updateImportProgress('directory', progress),
      onPhotoImported: (photo) => addPhotos([photo]),
      onPhotoUpdated: updatePhoto,
    });
    if (!result.length) {
      finishImport('directory');
      return;
    }
    finishImport('directory');
  }, [addPhotos, finishImport, startImport, updateImportProgress, updatePhoto]);

  const importViaDrop = useCallback(
    async (files: FileList | File[]) => {
      startImport('drop');
      const result = await processDroppedFiles(files, {
        onProgress: (progress) => updateImportProgress('drop', progress),
        onPhotoImported: (photo) => addPhotos([photo]),
        onPhotoUpdated: updatePhoto,
      });
      if (!result.length) {
        finishImport('drop');
        return;
      }
      finishImport('drop');
    },
    [addPhotos, finishImport, startImport, updateImportProgress, updatePhoto],
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
            if (!result.length) {
              finishImport('drop');
              break;
            }
            finishImport('drop');
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
  }, [addPhotos, finishImport, pageActive, startImport, updateImportProgress, updatePhoto]);

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
