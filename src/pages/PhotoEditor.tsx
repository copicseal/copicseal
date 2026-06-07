import { Camera, Download, ImageIcon, LayoutTemplate, Palette, Type } from 'lucide-react';
import type { ControlPanelTab } from '@/components/CoControlPanel';
import { ControlPanel } from '@/components/CoControlPanel';
import { CoDropZone, CoFileInput } from '@/components/CoDropZone';
import { CoBackgroundPanel } from '@/components/panels/CoBackgroundPanel';
import { CoExifPanel } from '@/components/panels/CoExifPanel';
import { CoExportPanel } from '@/components/panels/CoExportPanel';
import { CoFontPanel } from '@/components/panels/CoFontPanel';
import { CoTemplatePanel } from '@/components/panels/CoTemplatePanel';
import { usePhotos } from '@/hooks/usePhotos';

const CONTROL_TABS: ControlPanelTab[] = [
  { id: 'exif', label: '照片信息', icon: Camera, content: <CoExifPanel /> },
  { id: 'template', label: '模板', icon: LayoutTemplate, content: <CoTemplatePanel /> },
  { id: 'background', label: '背景', icon: Palette, content: <CoBackgroundPanel /> },
  { id: 'font', label: '字体', icon: Type, content: <CoFontPanel /> },
  { id: 'export', label: '导出', icon: Download, content: <CoExportPanel /> },
];

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

            <ControlPanel tabs={CONTROL_TABS} defaultOpen={['export']} className="w-56 shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
}
