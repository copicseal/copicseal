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
  BusinessWorkbenchPropertiesPane,
  BusinessWorkbenchWorkspace,
} from '@/shared/layouts/BusinessWorkbench';
import { CollageCanvas, CollagePropertiesPanel, CollageToolbar } from './exports';

function ImportProgressPanel({
  current,
  total,
  currentName,
}: {
  current: number;
  total: number;
  currentName: string | null;
}) {
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <div className="mt-4 border border-border/80 bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">正在导入图片</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {total > 0 ? `已导入 ${current} / ${total}` : '正在准备导入...'}
            {currentName ? ` · ${currentName}` : ''}
          </p>
        </div>
        <p className="shrink-0 text-xs font-medium text-muted-foreground">
          {Math.round(progress)}%
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

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

function CollageAssetsPanel() {
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
    importState,
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
    <BusinessWorkbenchAssetsPane>
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

      {importState.active ? (
        <ImportProgressPanel
          current={importState.current}
          total={importState.total}
          currentName={importState.currentName}
        />
      ) : null}

      <div
        className={cn('mt-4', importState.active ? 'h-[calc(100%-152px)]' : 'h-[calc(100%-64px)]')}
      >
        {photos.length === 0 ? (
          <CoDropZone
            onFilesDrop={importViaDrop}
            className="h-full rounded-none border-border/60 bg-muted/20"
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <ImageIcon className="size-6" />
              <div>
                <p className="text-sm font-medium">
                  {importState.active ? '图片正在导入中…' : '拖入图片开始拼图'}
                </p>
                <p className="text-xs">
                  {importState.active
                    ? '导入过程中会逐步生成缩略图并加入当前素材区'
                    : '或点击右上角“导入图片”从本地选择'}
                </p>
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
                  <div
                    key={photo.id}
                    draggable
                    className={cn(
                      'group shrink-0 border bg-card transition-colors',
                      selected || active
                        ? 'border-primary ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/40',
                    )}
                    style={{ width: 160 }}
                  >
                    <button
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
                      className="flex h-full w-full flex-col text-left"
                    >
                      <div
                        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-background/80"
                        style={{ aspectRatio: '4 / 3' }}
                      >
                        {photo.thumbnailReady ? (
                          <img
                            src={photo.thumbnailUrl}
                            alt={photo.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/40 px-4 text-center">
                            <span className="line-clamp-3 text-xs font-medium text-foreground">
                              {photo.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              正在生成缩略图
                            </span>
                          </div>
                        )}
                        {selected || active ? (
                          <div className="pointer-events-none absolute inset-0 ring-2 ring-primary/60" />
                        ) : null}
                      </div>
                      <div className="border-t border-border/80 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-foreground">
                            {photo.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(photo.size / 1024 / 1024).toFixed(1)} MB
                            {selected ? ' · 已选中' : ''}
                          </p>
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          拖到上方画布即可放入拼图
                        </div>
                      </div>
                    </button>
                    <div className="border-t border-border/80 px-3 pb-2">
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <button
                          type="button"
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                          onClick={() => {
                            removePhotoReferences(photo.id);
                            removePhoto(photo.id);
                          }}
                        >
                          删除
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            void handleCollageReplace(photo.id);
                          }}
                        >
                          替换
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
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
      assets={() => <CollageAssetsPanel />}
      properties={() => (
        <CollagePropertiesPane
          onExportCurrent={handleExportCurrent}
          onExportBatch={handleExportBatch}
        />
      )}
    />
  );
}
