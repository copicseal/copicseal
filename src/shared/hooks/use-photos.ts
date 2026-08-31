import { useContext } from 'react';
import { PhotoContext } from '@/shared/providers/photo-provider';

export function usePhotos() {
  const context = useContext(PhotoContext);
  if (!context) {
    throw new Error('usePhotos must be used within PhotoProvider');
  }

  return context;
}
