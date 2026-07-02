import { Download, FolderOpen, ImageIcon, LayoutTemplate, MoveHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { exportSingle } from '@/bridge/export.api';
import { getBuiltinTemplateSchema } from '@/bridge/template.api';
import { CoDropZone } from '@/components/CoDropZone';
import { CoWindowHeader } from '@/components/CoWindowHeader';
import { Button } from '@/components/ui/button';
import { prepareElementForSnapshot } from '@/core/renderer';
import { runScheduledExports } from '@/core/scheduler';
import { usePhotos } from '@/hooks/usePhotos';
import { cn } from '@/lib/utils';
import {
  BusinessWorkbench,
  BusinessWorkbenchAssetsPane,
  BusinessWorkbenchPropertiesPane,
  BusinessWorkbenchWorkspace,
} from '@/shared/layouts/BusinessWorkbench';
import {
  TemplateExportPanel,
  TemplatePreview,
  TemplatePropsPanel,
  TemplateSelector,
  useTemplatePreviewState,
} from './exports';

function TemplateHeader() {
  return (
    <CoWindowHeader
      icon={LayoutTemplate}
      title="边框水印"
      description="模板渲染与导出"
      actions={
        <Button size="sm">
          <Download data-icon="inline-start" />
          导出
        </Button>
      }
    />
  );
}

function TemplateAssetsPanel() {
  const {
    photos,
    currentIndex,
    setCurrentIndex,
    selectedIds,
    removePhoto,
    removeSelectedPhotos,
    movePhoto,
    togglePhotoSelection,
    selectSinglePhoto,
    selectAllPhotos,
    importViaDialog,
    importViaDirectory,
    importViaDrop,
  } = usePhotos();
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        selectAllPhotos();
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedIds.length > 0) {
          event.preventDefault();
          removeSelectedPhotos();
        }
      }
    };

    const handlePaste = async (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        event.preventDefault();
        await importViaDrop(files);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [importViaDrop, removeSelectedPhotos, selectAllPhotos, selectedIds.length]);

  return (
    <BusinessWorkbenchAssetsPane>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">边框水印素材</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            当前功能页内的图片缩略图列表，支持拖拽排序、粘贴与文件夹导入。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void importViaDirectory()}>
            <FolderOpen data-icon="inline-start" />
            文件夹导入
          </Button>
          <Button variant="outline" size="sm" onClick={() => void importViaDialog()}>
            <ImageIcon data-icon="inline-start" />
            导入图片
          </Button>
        </div>
      </div>

      <div className="mt-4 h-[calc(100%-64px)]">
        {photos.length === 0 ? (
          <CoDropZone
            onFilesDrop={importViaDrop}
            className="h-full rounded-none border-border/60 bg-muted/20"
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <ImageIcon className="size-6" />
              <div>
                <p className="text-sm font-medium">拖入图片开始边框水印</p>
                <p className="text-xs">或点击右上角“导入图片”从本地选择</p>
              </div>
            </div>
          </CoDropZone>
        ) : (
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <div className="flex h-full gap-3 pb-3">
              {photos.map((photo, index) => {
                const active = index === currentIndex;
                const selected = selectedIds.includes(photo.id);

                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={(event) => {
                      setCurrentIndex(index);
                      if (event.metaKey || event.ctrlKey) {
                        togglePhotoSelection(photo.id);
                      } else {
                        selectSinglePhoto(photo.id);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setCurrentIndex(index);
                        selectSinglePhoto(photo.id);
                      }
                    }}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/copicseal-photo-id', photo.id);
                      setDraggedPhotoId(photo.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedPhotoId && draggedPhotoId !== photo.id) {
                        movePhoto(draggedPhotoId, photo.id);
                      }
                      setDraggedPhotoId(null);
                    }}
                    onDragEnd={() => setDraggedPhotoId(null)}
                    className={cn(
                      'group shrink-0 border bg-card text-left transition-colors cursor-grab active:cursor-grabbing',
                      selected || active
                        ? 'border-primary ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/40',
                    )}
                    style={{ width: 160 }}
                  >
                    <div className="flex h-full flex-col">
                      <div
                        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-background/80"
                        style={{ aspectRatio: '4 / 3' }}
                      >
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.name}
                          className="h-full w-full object-cover"
                        />
                        {selected || active ? (
                          <div className="pointer-events-none absolute inset-0 ring-2 ring-primary/60" />
                        ) : null}
                      </div>
                      <div className="border-t border-border/80 px-3 py-2">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-medium text-foreground">
                              {photo.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {(photo.size / 1024 / 1024).toFixed(1)} MB
                              {selected ? ' · 已选中' : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                            onClick={(event) => {
                              event.stopPropagation();
                              removePhoto(photo.id);
                            }}
                          >
                            删除
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MoveHorizontal className="size-3" />
                          <span>拖拽排序</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </BusinessWorkbenchAssetsPane>
  );
}

function TemplatePropertiesPanel({
  activeTemplateId,
  onTemplateChange,
  templateProps,
  onTemplatePropsChange,
  onExportCurrent,
  onExportBatch,
}: {
  activeTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  templateProps: Parameters<typeof TemplatePreview>[0]['templateProps'];
  onTemplatePropsChange: (next: Parameters<typeof TemplatePreview>[0]['templateProps']) => void;
  onExportCurrent: Parameters<typeof TemplateExportPanel>[0]['onExportCurrent'];
  onExportBatch: Parameters<typeof TemplateExportPanel>[0]['onExportBatch'];
}) {
  const templateSchema = getBuiltinTemplateSchema(activeTemplateId);

  return (
    <BusinessWorkbenchPropertiesPane>
      <div className="border-b border-border/80 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Properties
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-3">
          <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
            <TemplateSelector
              activeTemplateId={activeTemplateId}
              onTemplateChange={onTemplateChange}
            />
          </section>
          {templateSchema ? (
            <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
              <TemplatePropsPanel
                schema={templateSchema}
                value={templateProps}
                onChange={onTemplatePropsChange}
              />
            </section>
          ) : null}
          <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
            <TemplateExportPanel onExportCurrent={onExportCurrent} onExportBatch={onExportBatch} />
          </section>
        </div>
      </div>
    </BusinessWorkbenchPropertiesPane>
  );
}

export function TemplatePage() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { templateId, setTemplateId, templateProps, setTemplateProps } = useTemplatePreviewState();
  const { photos, currentIndex, setCurrentIndex, currentPhoto } = usePhotos();

  const handleExportCurrent: Parameters<typeof TemplateExportPanel>[0]['onExportCurrent'] = async (
    options,
  ) => {
    if (!previewRef.current) {
      return;
    }

    await prepareElementForSnapshot(previewRef.current);
    await exportSingle(previewRef.current, options, currentPhoto?.path);
  };

  const handleExportBatch: Parameters<typeof TemplateExportPanel>[0]['onExportBatch'] = async (
    options,
  ) => {
    if (!previewRef.current || photos.length === 0) {
      return;
    }

    const originalIndex = currentIndex;

    await runScheduledExports({
      items: photos,
      runner: async (photo, index) => {
        setCurrentIndex(index);
        await new Promise((resolve) => setTimeout(resolve, 120));
        if (!previewRef.current) {
          return;
        }
        await prepareElementForSnapshot(previewRef.current);
        await exportSingle(previewRef.current, options, photo.path);
      },
    });

    setCurrentIndex(originalIndex);
  };

  return (
    <BusinessWorkbench
      header={<TemplateHeader />}
      workspace={
        <BusinessWorkbenchWorkspace>
          <div className="flex h-full w-full min-h-0 min-w-0 items-center justify-center">
            <TemplatePreview
              activeTemplateId={templateId}
              templateProps={templateProps}
              previewRef={previewRef}
            />
          </div>
        </BusinessWorkbenchWorkspace>
      }
      assets={() => <TemplateAssetsPanel />}
      properties={() => (
        <TemplatePropertiesPanel
          activeTemplateId={templateId}
          onTemplateChange={setTemplateId}
          templateProps={templateProps}
          onTemplatePropsChange={setTemplateProps}
          onExportCurrent={handleExportCurrent}
          onExportBatch={handleExportBatch}
        />
      )}
    />
  );
}
