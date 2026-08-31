import { createContext, type FC, type ReactNode, useCallback, useEffect, useState } from 'react';
import { onNativeFileDrop } from '@/platform';
import {
  type ImportProgressSnapshot,
  importPhotosViaPaths,
  processDroppedFiles,
  selectPhotosFromDirectory,
  selectPhotosViaDialog,
} from '@/shared/lib/import-photo';
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
  selectedIds: string[];
  isDraggingOver: boolean;
  importState: PhotoImportState;
  addPhotos: (photos: ImportedPhoto[]) => void;
  removePhoto: (id: string) => void;
  removeSelectedPhotos: () => void;
  replacePhoto: (id: string, nextPhoto: ImportedPhoto) => void;
  setCurrentIndex: (index: number) => void;
  togglePhotoSelection: (id: string) => void;
  selectSinglePhoto: (id: string) => void;
  selectAllPhotos: () => void;
  clearSelection: () => void;
  importViaDialog: () => Promise<void>;
  importViaDirectory: () => Promise<void>;
  importViaDrop: (files: FileList | File[]) => Promise<void>;
}

export const PhotoContext = createContext<PhotoContextValue | null>(null);

export const PhotoProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [photos, setPhotos] = useState<ImportedPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
    setSelectedIds((prev) => [...prev, ...newPhotos.map((photo) => photo.id)]);
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
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  }, []);

  const removeSelectedPhotos = useCallback(() => {
    setPhotos((prev) => prev.filter((photo) => !selectedIds.includes(photo.id)));
    setSelectedIds([]);
    setCurrentIndex(0);
  }, [selectedIds]);

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
  }, [addPhotos, finishImport, startImport, updateImportProgress, updatePhoto]);

  const currentPhoto = photos[currentIndex] ?? null;

  const togglePhotoSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const selectSinglePhoto = useCallback((id: string) => {
    setSelectedIds([id]);
  }, []);

  const selectAllPhotos = useCallback(() => {
    setSelectedIds(photos.map((photo) => photo.id));
  }, [photos]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return (
    <PhotoContext.Provider
      value={{
        photos,
        currentIndex,
        currentPhoto,
        selectedIds,
        isDraggingOver,
        importState,
        addPhotos,
        removePhoto,
        removeSelectedPhotos,
        replacePhoto,
        setCurrentIndex,
        togglePhotoSelection,
        selectSinglePhoto,
        selectAllPhotos,
        clearSelection,
        importViaDialog,
        importViaDirectory,
        importViaDrop,
      }}
    >
      {children}
    </PhotoContext.Provider>
  );
};
