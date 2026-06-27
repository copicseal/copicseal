import {
  ChevronDown,
  ChevronUp,
  Download,
  FolderOpen,
  Grid3x3,
  ImageIcon,
  LayoutTemplate,
  MoveHorizontal,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { exportSingle } from '@/bridge/export.api';
import { getBuiltinTemplateSchema } from '@/bridge/template.api';
import { CoDropZone } from '@/components/CoDropZone';
import type { AppRoute } from '@/components/CoSidebar';
import { Button } from '@/components/ui/button';
import { prepareElementForSnapshot } from '@/core/renderer';
import { runScheduledExports } from '@/core/scheduler';
import { CollageCanvas, CollagePropertiesPanel, CollageToolbar } from '@/features/collage';
import {
  TemplateExportPanel,
  TemplatePreview,
  TemplatePropsPanel,
  TemplateSelector,
  useTemplatePreviewState,
} from '@/features/template';
import { usePhotos } from '@/hooks/usePhotos';
import { selectPhotosViaDialog } from '@/lib/import-photo';
import { cn } from '@/lib/utils';
import { useCollageStore } from '@/modules/collage/store/use-collage-store';

const PROPERTY_MIN_WIDTH = 280;
const PROPERTY_MAX_WIDTH = 420;
const PROPERTY_DEFAULT_WIDTH = 320;
const ASSETS_MIN_HEIGHT = 132;
const ASSETS_MAX_HEIGHT = 260;
const ASSETS_DEFAULT_HEIGHT = 188;

interface BusinessWorkbenchProps {
  route: Extract<AppRoute, '/template' | '/collage'>;
}

const copy = {
  '/template': {
    badge: 'Template',
    title: 'Template Preview',
    description: 'Workspace 是边框水印的真实渲染区域，后续会由 <TemplateRuntime /> 承载。',
    assetsTitle: 'Template Assets',
    assetsDescription: '当前功能页内的图片缩略图列表，后续接入拖拽、粘贴、文件夹导入和多选。',
  },
  '/collage': {
    badge: 'Collage',
    title: 'Collage Preview',
    description: 'Workspace 是拼图的真实渲染区域，当前已接入真实 CollageCanvas 预览。',
    assetsTitle: 'Collage Assets',
    assetsDescription: '当前拼图会话的局部素材区，后续接入排序、替换图片和拖入拼图。',
  },
} as const;

function clampWidth(width: number) {
  return Math.min(PROPERTY_MAX_WIDTH, Math.max(PROPERTY_MIN_WIDTH, width));
}

function clampAssetsHeight(height: number) {
  return Math.min(ASSETS_MAX_HEIGHT, Math.max(ASSETS_MIN_HEIGHT, height));
}

function ToolRail({ route }: { route: BusinessWorkbenchProps['route'] }) {
  const isTemplate = route === '/template';

  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-border/80 px-5 py-3">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        {isTemplate ? <LayoutTemplate className="size-3.5" /> : <Grid3x3 className="size-3.5" />}
        {isTemplate ? 'Template' : 'Collage'}
      </div>
      {isTemplate ? <div className="ml-auto" /> : <CollageToolbar />}
      {isTemplate ? (
        <Button size="sm" className="rounded-full px-3">
          <Download data-icon="inline-start" />
          导出
        </Button>
      ) : null}
    </div>
  );
}

function WorkspacePanel({
  route,
  activeTemplateId,
  templateProps,
  previewRef,
}: {
  route: BusinessWorkbenchProps['route'];
  activeTemplateId: string;
  templateProps: Parameters<typeof TemplatePreview>[0]['templateProps'];
  previewRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isTemplate = route === '/template';

  return (
    <section className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden border border-r-0 border-b-0 border-border/80 bg-[radial-gradient(circle_at_top,_var(--color-accent),transparent_45%),linear-gradient(180deg,color-mix(in_oklch,var(--color-background),white_55%)_0%,var(--color-background)_100%)] p-6">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--color-border),transparent_35%)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--color-border),transparent_35%)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35" />
      {isTemplate ? (
        <div className="relative flex h-full w-full min-h-0 min-w-0 items-center justify-center">
          <TemplatePreview
            activeTemplateId={activeTemplateId}
            templateProps={templateProps}
            previewRef={previewRef}
          />
        </div>
      ) : (
        <div className="relative flex h-full w-full min-h-0 min-w-0">
          <CollageCanvas previewRef={previewRef} />
        </div>
      )}
    </section>
  );
}

function AssetsPanel({
  route,
  collapsed,
  height,
  onToggleCollapse,
  onResizeStart,
}: {
  route: BusinessWorkbenchProps['route'];
  collapsed: boolean;
  height: number;
  onToggleCollapse: () => void;
  onResizeStart: (clientY: number) => void;
}) {
  const {
    photos,
    currentIndex,
    setCurrentIndex,
    replacePhoto,
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
  const { removePhotoReferences } = useCollageStore();
  const content = copy[route];
  const isTemplate = route === '/template';
  const cardHeight = Math.max(72, height - 92);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

  useEffect(() => {
    if (!isTemplate) {
      return;
    }

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
  }, [importViaDrop, isTemplate, removeSelectedPhotos, selectAllPhotos, selectedIds.length]);

  const handleCollageReplace = async (photoId: string) => {
    const selected = await selectPhotosViaDialog();
    if (!selected[0]) {
      return;
    }

    replacePhoto(photoId, selected[0]);
  };

  return (
    <section
      className="relative min-w-0 border border-r-0 border-border/80 bg-card p-4 shadow-sm"
      style={{ height: collapsed ? 74 : height }}
    >
      <div className="absolute top-0 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
        <button
          type="button"
          aria-label="调整素材栏高度"
          className="relative h-3 w-24 cursor-row-resize"
          onMouseDown={(event) => onResizeStart(event.clientY)}
        >
          <span className="absolute top-1/2 left-1/2 h-1 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border transition-colors hover:bg-primary" />
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full bg-background/90"
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{content.assetsTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{content.assetsDescription}</p>
        </div>
        <div className="flex items-center gap-2">
          {isTemplate ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-3"
              onClick={() => void importViaDirectory()}
            >
              <FolderOpen data-icon="inline-start" />
              文件夹导入
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-3"
            onClick={() => void importViaDialog()}
          >
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
                  <p className="text-sm font-medium">
                    {isTemplate ? '拖入图片开始边框水印' : '拖入图片开始拼图'}
                  </p>
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
                        if (isTemplate) {
                          setDraggedPhotoId(photo.id);
                        }
                      }}
                      onDragOver={(event) => {
                        if (!isTemplate) {
                          return;
                        }
                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        if (!isTemplate) {
                          return;
                        }
                        event.preventDefault();
                        if (draggedPhotoId && draggedPhotoId !== photo.id) {
                          movePhoto(draggedPhotoId, photo.id);
                        }
                        setDraggedPhotoId(null);
                      }}
                      onDragEnd={() => setDraggedPhotoId(null)}
                      className={cn(
                        'group shrink-0 border bg-card text-left transition-colors',
                        selected || active
                          ? 'border-primary ring-1 ring-primary/20'
                          : 'border-border hover:border-primary/40',
                        isTemplate && 'cursor-grab active:cursor-grabbing',
                      )}
                      style={{
                        width: isTemplate ? Math.max(132, cardHeight * (4 / 3)) : 160,
                        height: isTemplate ? cardHeight : undefined,
                      }}
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
                                if (!isTemplate) {
                                  removePhotoReferences(photo.id);
                                }
                                removePhoto(photo.id);
                              }}
                            >
                              删除
                            </button>
                          </div>
                          {isTemplate ? (
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MoveHorizontal className="size-3" />
                              <span>拖拽排序</span>
                            </div>
                          ) : (
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
                          )}
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
    </section>
  );
}

function PropertiesPanel({
  route,
  width,
  onResizeStart,
  activeTemplateId,
  onTemplateChange,
  templateProps,
  onTemplatePropsChange,
  onExportCurrent,
  onExportBatch,
}: {
  route: BusinessWorkbenchProps['route'];
  width: number;
  onResizeStart: (clientX: number) => void;
  activeTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  templateProps: Parameters<typeof TemplatePreview>[0]['templateProps'];
  onTemplatePropsChange: (next: Parameters<typeof TemplatePreview>[0]['templateProps']) => void;
  onExportCurrent: (
    options: Parameters<typeof TemplateExportPanel>[0]['onExportCurrent'] extends (
      arg: infer A,
    ) => Promise<void>
      ? A
      : never,
  ) => Promise<void>;
  onExportBatch: (
    options: Parameters<typeof TemplateExportPanel>[0]['onExportBatch'] extends (
      arg: infer A,
    ) => Promise<void>
      ? A
      : never,
  ) => Promise<void>;
}) {
  const isTemplate = route === '/template';
  const templateSchema = getBuiltinTemplateSchema(activeTemplateId);

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-l border-border/80 bg-card/90"
      style={{ width }}
    >
      <button
        type="button"
        aria-label="调整属性面板宽度"
        className="absolute top-0 -left-1.5 z-10 h-full w-3 cursor-col-resize"
        onMouseDown={(event) => onResizeStart(event.clientX)}
      >
        <span className="absolute top-1/2 left-1/2 h-16 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border transition-colors hover:bg-primary" />
      </button>

      <div className="border-b border-border/80 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Properties
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          默认宽度 320px，可拖拽调整到 280px - 420px。
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-3">
          {isTemplate ? (
            <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
              <TemplateSelector
                activeTemplateId={activeTemplateId}
                onTemplateChange={onTemplateChange}
              />
            </section>
          ) : null}
          {isTemplate && templateSchema ? (
            <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
              <TemplatePropsPanel
                schema={templateSchema}
                value={templateProps}
                onChange={onTemplatePropsChange}
              />
            </section>
          ) : null}
          {isTemplate ? (
            <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
              <TemplateExportPanel
                onExportCurrent={onExportCurrent}
                onExportBatch={onExportBatch}
              />
            </section>
          ) : (
            <CollagePropertiesPanel
              onExportCurrent={onExportCurrent}
              onExportBatch={onExportBatch}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

export function BusinessWorkbench({ route }: BusinessWorkbenchProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [propertiesWidth, setPropertiesWidth] = useState(PROPERTY_DEFAULT_WIDTH);
  const [assetsHeight, setAssetsHeight] = useState(ASSETS_DEFAULT_HEIGHT);
  const [assetsCollapsed, setAssetsCollapsed] = useState(false);
  const { templateId, setTemplateId, templateProps, setTemplateProps } = useTemplatePreviewState();
  const { photos, currentIndex, setCurrentIndex, currentPhoto } = usePhotos();

  const handleResizeStart = (startX: number) => {
    const startWidth = propertiesWidth;

    const handlePointerMove = (event: MouseEvent) => {
      const nextWidth = clampWidth(startWidth - (event.clientX - startX));
      setPropertiesWidth(nextWidth);
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  const handleAssetsResizeStart = (startY: number) => {
    const startHeight = assetsHeight;

    const handlePointerMove = (event: MouseEvent) => {
      const nextHeight = clampAssetsHeight(startHeight - (event.clientY - startY));
      setAssetsHeight(nextHeight);
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  const handleExportCurrent = async (
    options: Parameters<typeof TemplateExportPanel>[0]['onExportCurrent'] extends (
      arg: infer A,
    ) => Promise<void>
      ? A
      : never,
  ) => {
    if (!previewRef.current) {
      return;
    }

    await prepareElementForSnapshot(previewRef.current);
    await exportSingle(previewRef.current, options, currentPhoto?.path);
  };

  const handleExportBatch = async (
    options: Parameters<typeof TemplateExportPanel>[0]['onExportBatch'] extends (
      arg: infer A,
    ) => Promise<void>
      ? A
      : never,
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
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ToolRail route={route} />
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
          <WorkspacePanel
            route={route}
            activeTemplateId={templateId}
            templateProps={templateProps}
            previewRef={previewRef}
          />
          <AssetsPanel
            route={route}
            collapsed={assetsCollapsed}
            height={assetsHeight}
            onToggleCollapse={() => setAssetsCollapsed((value) => !value)}
            onResizeStart={handleAssetsResizeStart}
          />
        </div>
        <PropertiesPanel
          route={route}
          width={propertiesWidth}
          onResizeStart={handleResizeStart}
          activeTemplateId={templateId}
          onTemplateChange={setTemplateId}
          templateProps={templateProps}
          onTemplatePropsChange={setTemplateProps}
          onExportCurrent={handleExportCurrent}
          onExportBatch={handleExportBatch}
        />
      </div>
    </div>
  );
}
