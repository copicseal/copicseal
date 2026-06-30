import { Grid3x3, ImageIcon } from 'lucide-react';
import { useRef } from 'react';
import { exportSingle } from '@/bridge/export.api';
import { CoDropZone } from '@/components/CoDropZone';
import { CoWindowHeader } from '@/components/CoWindowHeader';
import { Button } from '@/components/ui/button';
import { prepareElementForSnapshot } from '@/core/renderer';
import { runScheduledExports } from '@/core/scheduler';
import { useCollageStore } from '@/features/collage/store/use-collage-store';
import { usePhotos } from '@/hooks/usePhotos';
import { selectPhotosViaDialog } from '@/lib/import-photo';
import { cn } from '@/lib/utils';
import {
  BusinessWorkbench,
  BusinessWorkbenchAssetsPane,
  type BusinessWorkbenchAssetsRenderProps,
  BusinessWorkbenchPropertiesPane,
  BusinessWorkbenchWorkspace,
} from '@/shared/layouts/BusinessWorkbench';
import { CollageCanvas, CollagePropertiesPanel, CollageToolbar } from './exports';

function CollageHeader() {
  return (
    <CoWindowHeader
      icon={Grid3x3}
      title="拼图"
      description="布局编辑与导出"
      actions={<CollageToolbar />}
    />
  );
}

function CollageAssetsPanel({ collapsed, toggleCollapsed }: BusinessWorkbenchAssetsRenderProps) {
  const {
    photos,
    currentIndex,
    setCurrentIndex,
    replacePhoto,
    selectedIds,
    removePhoto,
    togglePhotoSelection,
    selectSinglePhoto,
    importViaDialog,
    importViaDrop,
  } = usePhotos();
  const { removePhotoReferences } = useCollageStore();

  const handleCollageReplace = async (photoId: string) => {
    const selected = await selectPhotosViaDialog();
    if (!selected[0]) {
      return;
    }

    replacePhoto(photoId, selected[0]);
  };

  return (
    <BusinessWorkbenchAssetsPane collapsed={collapsed} onToggleCollapse={toggleCollapsed}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">拼图素材</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            当前拼图会话的局部素材区，支持导入、替换和拖入画布。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void importViaDialog()}>
            <ImageIcon data-icon="inline-start" />
            导入图片
          </Button>
        </div>
      </div>

      {!collapsed ? (
        <div className="mt-4 h-[calc(100%-64px)]">
          {photos.length === 0 ? (
            <CoDropZone
              onFilesDrop={importViaDrop}
              className="h-full rounded-none border-border/60 bg-muted/20"
            >
              <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <ImageIcon className="size-6" />
                <div>
                  <p className="text-sm font-medium">拖入图片开始拼图</p>
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
                      className={cn(
                        'group shrink-0 border bg-card text-left transition-colors',
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
                            src={photo.previewUrl}
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
                                removePhotoReferences(photo.id);
                                removePhoto(photo.id);
                              }}
                            >
                              删除
                            </button>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>拖到上方画布即可放入拼图</span>
                            <button
                              type="button"
                              className="ml-auto hover:text-foreground"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCollageReplace(photo.id);
                              }}
                            >
                              替换
                            </button>
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
      ) : null}
    </BusinessWorkbenchAssetsPane>
  );
}

function CollagePropertiesPane({
  onExportCurrent,
  onExportBatch,
}: {
  onExportCurrent: Parameters<typeof CollagePropertiesPanel>[0]['onExportCurrent'];
  onExportBatch: Parameters<typeof CollagePropertiesPanel>[0]['onExportBatch'];
}) {
  return (
    <BusinessWorkbenchPropertiesPane>
      <div className="border-b border-border/80 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Properties
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <CollagePropertiesPanel onExportCurrent={onExportCurrent} onExportBatch={onExportBatch} />
      </div>
    </BusinessWorkbenchPropertiesPane>
  );
}

export function CollagePage() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { photos } = usePhotos();

  const handleExportCurrent: Parameters<typeof CollagePropertiesPanel>[0]['onExportCurrent'] =
    async (options) => {
      if (!previewRef.current) {
        return;
      }

      await prepareElementForSnapshot(previewRef.current);
      await exportSingle(previewRef.current, options);
    };

  const handleExportBatch: Parameters<typeof CollagePropertiesPanel>[0]['onExportBatch'] = async (
    options,
  ) => {
    if (!previewRef.current || photos.length === 0) {
      return;
    }

    await runScheduledExports({
      items: photos,
      runner: async () => {
        if (!previewRef.current) {
          return;
        }
        await prepareElementForSnapshot(previewRef.current);
        await exportSingle(previewRef.current, options);
      },
    });
  };

  return (
    <BusinessWorkbench
      header={<CollageHeader />}
      workspace={
        <BusinessWorkbenchWorkspace>
          <CollageCanvas previewRef={previewRef} />
        </BusinessWorkbenchWorkspace>
      }
      assets={(props) => <CollageAssetsPanel {...props} />}
      properties={() => (
        <CollagePropertiesPane
          onExportCurrent={handleExportCurrent}
          onExportBatch={handleExportBatch}
        />
      )}
    />
  );
}
