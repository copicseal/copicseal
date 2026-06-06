import { ImageIcon } from 'lucide-react';
import { CoDropZone, CoFileInput } from '@/components/CoDropZone';
import { usePhotos } from '@/hooks/usePhotos';

export function PhotoEditor() {
  const { photos, currentPhoto, importViaDrop, setCurrentIndex } = usePhotos();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {photos.length === 0 ? (
        <CoDropZone onFilesDrop={importViaDrop} className="m-4 flex-1">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <ImageIcon className="size-16 opacity-30" />
            <p className="text-lg font-medium">拖拽照片到此处</p>
            <p className="text-sm">或</p>
            <CoFileInput
              onFilesSelect={importViaDrop}
              accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
              multiple
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              选择文件
            </CoFileInput>
          </div>
        </CoDropZone>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b p-2">
            <CoFileInput
              onFilesSelect={importViaDrop}
              accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
              multiple
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              添加照片
            </CoFileInput>
            <span className="text-sm text-muted-foreground">{photos.length} 张照片</span>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="w-32 shrink-0 overflow-y-auto border-r p-2 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent">
              {photos.map((photo, index) => (
                <button
                  type="button"
                  key={photo.id}
                  className={`group mb-2 w-full cursor-pointer overflow-hidden rounded-md border-2 text-left transition-colors ${
                    index === (currentPhoto ? photos.indexOf(currentPhoto) : 0)
                      ? 'border-primary'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                  onClick={() => setCurrentIndex(index)}
                >
                  <img
                    src={photo.previewUrl}
                    alt={photo.name}
                    className="w-full max-h-32 object-cover"
                  />
                  <div className="p-1 text-[10px] leading-tight text-muted-foreground truncate">
                    {photo.name}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/30 p-4">
              {currentPhoto ? (
                <img
                  src={currentPhoto.previewUrl}
                  alt={currentPhoto.name}
                  className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                />
              ) : (
                <p className="text-muted-foreground">请选择一张照片</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
