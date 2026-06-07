import { Camera, Download, ImageIcon, LayoutTemplate, Palette, Settings, Type } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type ExifData, readExif } from '@/api';
import type { ControlPanelTab } from '@/components/CoControlPanel';
import { ControlPanel } from '@/components/CoControlPanel';
import { CoDropZone } from '@/components/CoDropZone';
import { ContextMenu } from '@/components/ContextMenu';
import { CoBackgroundPanel } from '@/components/panels/CoBackgroundPanel';
import { CoExifPanel } from '@/components/panels/CoExifPanel';
import { CoExportPanel } from '@/components/panels/CoExportPanel';
import { CoFontPanel } from '@/components/panels/CoFontPanel';
import { CoTemplatePanel } from '@/components/panels/CoTemplatePanel';
import { CoSettingsDialog } from '@/components/settings/CoSettingsDialog';
import { Button } from '@/components/ui/button';
import { usePhotos } from '@/hooks/usePhotos';
import { type ExportOptions, exportSingle } from '@/lib/export-photo';
import { getTemplateById } from '@/templates';

export function PhotoEditor() {
  const { photos, currentPhoto, importViaDialog, setCurrentIndex, removePhoto } = usePhotos();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [orientation, setOrientation] = useState<'auto' | 'horizontal' | 'vertical'>('auto');
  const [exif, setExif] = useState<ExifData | null>(null);
  const [exifLoading, setExifLoading] = useState(false);
  const [baseSize, setBaseSize] = useState(1000);
  const templateRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    id: string;
    name: string;
  } | null>(null);

  const loadExif = useCallback(async (path: string) => {
    setExifLoading(true);
    try {
      const data = await readExif(path);
      setExif(data);
    } catch {
      setExif(null);
    } finally {
      setExifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPhoto?.path) {
      loadExif(currentPhoto.path);
    } else {
      setExif(null);
    }
  }, [currentPhoto, loadExif]);

  const templateEntry = templateId ? getTemplateById(templateId) : undefined;
  const TemplateComp = templateEntry?.component;

  const adjustBaseSize = useCallback(
    (v: number): Promise<void> =>
      new Promise<void>((resolve) => {
        setBaseSize(v);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
    [],
  );

  const handleExportSingle = useCallback(
    async (options: ExportOptions, onProgress: (p: { current: number; total: number }) => void) => {
      if (!templateRef.current) {
        console.error('导出失败: 未找到模板元素');
        return;
      }
      try {
        onProgress({ current: 0, total: 1 });
        await exportSingle(templateRef.current, options, adjustBaseSize);
        onProgress({ current: 1, total: 1 });
      } catch (err) {
        console.error('导出失败:', err);
      }
    },
    [adjustBaseSize],
  );

  const handleExportBatch = useCallback(
    async (options: ExportOptions, onProgress: (p: { current: number; total: number }) => void) => {
      if (!templateRef.current) return;
      const total = photos.length;
      for (let i = 0; i < total; i++) {
        setCurrentIndex(i);
        await new Promise((r) => setTimeout(r, 100));
        try {
          await exportSingle(templateRef.current, options, adjustBaseSize);
        } catch (err) {
          console.error(`导出第 ${i + 1} 张失败:`, err);
        }
        onProgress({ current: i + 1, total });
      }
    },
    [adjustBaseSize, photos.length, setCurrentIndex],
  );

  const tabs: ControlPanelTab[] = [
    {
      id: 'exif',
      label: '照片信息',
      icon: Camera,
      content: <CoExifPanel exif={exif} loading={exifLoading} />,
    },
    {
      id: 'template',
      label: '模板',
      icon: LayoutTemplate,
      content: (
        <CoTemplatePanel
          selectedId={templateId}
          onSelectId={setTemplateId}
          fontScale={fontScale}
          onFontScaleChange={setFontScale}
          orientation={orientation}
          onOrientationChange={setOrientation}
        />
      ),
    },
    { id: 'background', label: '背景', icon: Palette, content: <CoBackgroundPanel /> },
    { id: 'font', label: '字体', icon: Type, content: <CoFontPanel /> },
    {
      id: 'export',
      label: '导出',
      icon: Download,
      content: (
        <CoExportPanel onExportSingle={handleExportSingle} onExportBatch={handleExportBatch} />
      ),
    },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {photos.length === 0 ? (
        <CoDropZone onFilesDrop={importViaDialog} className="m-4 flex-1">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <ImageIcon className="size-16 opacity-30" />
            <p className="text-lg font-medium">拖拽照片到此处</p>
            <p className="text-sm">或</p>
            <Button
              onClick={() => importViaDialog()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              选择文件
            </Button>
          </div>
        </CoDropZone>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b p-2">
            <Button
              onClick={() => importViaDialog()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              添加照片
            </Button>
            <span className="flex-1 text-sm text-muted-foreground">{photos.length} 张照片</span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSettingsOpen(true)}
              title="设置"
            >
              <Settings className="size-3.5" />
            </Button>
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
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, id: photo.id, name: photo.name });
                  }}
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

            <div
              ref={templateRef}
              className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/30 p-4"
              style={{ '--base-size': `${baseSize}px` } as React.CSSProperties}
            >
              <div className="w-[calc(var(--base-size)*1px)] max-w-full">
                {currentPhoto && TemplateComp ? (
                  <TemplateComp
                    photoUrl={currentPhoto.previewUrl}
                    exif={exif}
                    orientation={orientation}
                    margin={1}
                    fontScale={fontScale}
                    primaryColor="#1a1a1a"
                    borderColor="#1a1a1a"
                    textLine1="{Make} {Model}"
                    textLine2="{FocalLength}  f/{FNumber}  {ExposureTime}s  ISO{ISO}"
                  />
                ) : currentPhoto ? (
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

            <ControlPanel tabs={tabs} defaultOpen={['export']} className="w-56 shrink-0" />
          </div>
        </div>
      )}
      <CoSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: `移除 "${contextMenu.name}"`,
              onClick: () => removePhoto(contextMenu.id),
            },
          ]}
        />
      )}
    </div>
  );
}
