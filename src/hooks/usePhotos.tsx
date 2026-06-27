import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  importPhotosViaPaths,
  processDroppedFiles,
  selectPhotosFromDirectory,
  selectPhotosViaDialog,
} from '@/lib/import-photo';
import type { ImportedPhoto } from '@/lib/photo';

interface PhotoContextValue {
  photos: ImportedPhoto[];
  currentIndex: number;
  currentPhoto: ImportedPhoto | null;
  selectedIds: string[];
  isDraggingOver: boolean;
  addPhotos: (photos: ImportedPhoto[]) => void;
  removePhoto: (id: string) => void;
  removeSelectedPhotos: () => void;
  replacePhoto: (id: string, nextPhoto: ImportedPhoto) => void;
  movePhoto: (activeId: string, overId: string) => void;
  setCurrentIndex: (index: number) => void;
  togglePhotoSelection: (id: string) => void;
  selectSinglePhoto: (id: string) => void;
  selectAllPhotos: () => void;
  clearSelection: () => void;
  importViaDialog: () => Promise<void>;
  importViaDirectory: () => Promise<void>;
  importViaDrop: (files: FileList | File[]) => Promise<void>;
}

const PhotoContext = createContext<PhotoContextValue | null>(null);

export const PhotoProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [photos, setPhotos] = useState<ImportedPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const addPhotos = useCallback((newPhotos: ImportedPhoto[]) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
    setSelectedIds((prev) => [...prev, ...newPhotos.map((photo) => photo.id)]);
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

  const movePhoto = useCallback((activeId: string, overId: string) => {
    if (activeId === overId) {
      return;
    }

    setPhotos((prev) => {
      const activeIndex = prev.findIndex((photo) => photo.id === activeId);
      const overIndex = prev.findIndex((photo) => photo.id === overId);

      if (activeIndex === -1 || overIndex === -1) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(activeIndex, 1);
      next.splice(overIndex, 0, moved);
      return next;
    });
  }, []);

  const importViaDialog = useCallback(async () => {
    const result = await selectPhotosViaDialog();
    if (result.length) addPhotos(result);
  }, [addPhotos]);

  const importViaDirectory = useCallback(async () => {
    const result = await selectPhotosFromDirectory();
    if (result.length) addPhotos(result);
  }, [addPhotos]);

  const importViaDrop = useCallback(
    async (files: FileList | File[]) => {
      const result = await processDroppedFiles(files);
      if (result.length) addPhotos(result);
    },
    [addPhotos],
  );

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent(async (event) => {
      switch (event.payload.type) {
        case 'enter':
          setIsDraggingOver(true);
          break;
        case 'leave':
          setIsDraggingOver(false);
          break;
        case 'drop': {
          setIsDraggingOver(false);
          const result = await importPhotosViaPaths(event.payload.paths);
          if (result.length) addPhotos(result);
          break;
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addPhotos]);

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
        addPhotos,
        removePhoto,
        removeSelectedPhotos,
        replacePhoto,
        movePhoto,
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

export function usePhotos() {
  const ctx = useContext(PhotoContext);
  if (!ctx) throw new Error('usePhotos must be used within PhotoProvider');
  return ctx;
}
