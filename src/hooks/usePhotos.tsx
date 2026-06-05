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
  selectPhotosViaDialog,
} from '@/lib/import-photo';
import type { ImportedPhoto } from '@/lib/photo';

interface PhotoContextValue {
  photos: ImportedPhoto[];
  currentIndex: number;
  currentPhoto: ImportedPhoto | null;
  isDraggingOver: boolean;
  addPhotos: (photos: ImportedPhoto[]) => void;
  removePhoto: (id: string) => void;
  setCurrentIndex: (index: number) => void;
  importViaDialog: () => Promise<void>;
  importViaDrop: (files: FileList | File[]) => Promise<void>;
}

const PhotoContext = createContext<PhotoContextValue | null>(null);

export const PhotoProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [photos, setPhotos] = useState<ImportedPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const addPhotos = useCallback((newPhotos: ImportedPhoto[]) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
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

  const importViaDialog = useCallback(async () => {
    const result = await selectPhotosViaDialog();
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

  return (
    <PhotoContext.Provider
      value={{
        photos,
        currentIndex,
        currentPhoto,
        isDraggingOver,
        addPhotos,
        removePhoto,
        setCurrentIndex,
        importViaDialog,
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
