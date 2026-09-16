import {
  ChevronDown,
  ChevronUp,
  Download,
  FolderOpen,
  ImageIcon,
  LayoutTemplate,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { prepareElementForSnapshot, waitForDomStability, waitForImages } from '@/core/renderer';
import { runScheduledExports } from '@/core/scheduler';
import {
  TEMPLATE_BACKGROUND_FIELDS,
  type TemplateBackground,
  toTemplateBackground,
} from '@/features/template/background';
import { resolvePreviewTarget } from '@/features/template/lib/export-preset';
import { applyRenderSize } from '@/features/template/lib/render-size';
import { getBuiltinTemplateSchema } from '@/features/template/runtime/template-registry';
import { type ExportRunContext, exportSingle, resolveExportDirectory } from '@/platform';
import { CoDropZone } from '@/shared/components/co-drop-zone';
import { CoWindowHeader } from '@/shared/components/co-window-header';
import { usePhotos } from '@/shared/hooks/use-photos';
import {
  BusinessWorkbench,
  BusinessWorkbenchAssetsPane,
  BusinessWorkbenchPropertiesPane,
  BusinessWorkbenchWorkspace,
} from '@/shared/layouts/business-workbench';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import {
  TemplateExifCard,
  TemplateExportPanel,
  TemplatePreview,
  TemplatePropsPanel,
  TemplateSelector,
  useTemplatePreviewState,
} from '../exports';

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
    <div className="flex h-6 shrink-0 items-center gap-3 rounded-full border border-border/80 bg-muted/30 px-2">
      <p className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
        {total > 0 ? `正在导入 ${current} / ${total}` : '正在准备导入...'}
        {currentName ? ` · ${currentName}` : ''}
      </p>
      <div className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="w-7 shrink-0 text-right text-[10px] font-medium text-muted-foreground">
        {Math.round(progress)}%
      </p>
    </div>
  );
}

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

function TemplateAssetsPanel({
  collapsed,
  toggleCollapsed,
}: {
  collapsed: boolean;
  toggleCollapsed: () => void;
}) {
  const {
    photos,
    currentIndex,
    setCurrentIndex,
    selectedIds,
    removePhoto,
    removeSelectedPhotos,
    togglePhotoSelection,
    selectSinglePhoto,
    selectAllPhotos,
    importViaDialog,
    importViaDirectory,
    importViaDrop,
    importState,
  } = usePhotos();
  const currentPhoto = photos[currentIndex];

  const activatePhoto = (photoId: string, index: number, additive: boolean) => {
    setCurrentIndex(index);
    if (additive) {
      togglePhotoSelection(photoId);
    } else {
      selectSinglePhoto(photoId);
    }
  };

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
    <BusinessWorkbenchAssetsPane className="overflow-visible border-t border-border p-0">
      <TooltipProvider>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="plain"
                size="icon"
                aria-expanded={!collapsed}
                aria-controls="template-assets-content"
                aria-label={collapsed ? '展开素材面板' : '收起素材面板'}
                onClick={toggleCollapsed}
              >
                {collapsed ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {collapsed ? '展开素材面板' : '收起素材面板'}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {collapsed && photos.length > 0 ? (
            <div id="template-assets-content" className="h-full min-h-0 pt-4 pb-2">
              <ScrollArea
                horizontalWheelScroll
                scrollbarOrientation="none"
                viewportClassName="[&>div]:h-full"
                className="h-full w-full overflow-hidden"
              >
                <div className="flex h-full w-max min-w-full items-center gap-1.5 px-3">
                  {photos.map((photo, index) => {
                    const active = index === currentIndex;
                    const selected = selectedIds.includes(photo.id);

                    return (
                      <Tooltip key={photo.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`切换到 ${photo.name}`}
                            aria-current={active ? 'true' : undefined}
                            aria-pressed={selected}
                            className={cn(
                              'relative flex size-6 shrink-0 items-center justify-center overflow-hidden border bg-background/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                              active
                                ? 'border-primary ring-2 ring-primary/70'
                                : selected
                                  ? 'border-primary/60 ring-1 ring-primary/30'
                                  : 'border-border/70 hover:border-primary/50',
                            )}
                            onClick={(event) =>
                              activatePhoto(photo.id, index, event.metaKey || event.ctrlKey)
                            }
                          >
                            {photo.thumbnailReady ? (
                              <img
                                src={photo.thumbnailUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <ImageIcon
                                aria-hidden="true"
                                className="size-3 text-muted-foreground"
                              />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          {photo.name}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  {importState.active ? (
                    <ImportProgressPanel
                      current={importState.current}
                      total={importState.total}
                      currentName={importState.currentName}
                    />
                  ) : (
                    <div className="flex h-6 min-w-0 flex-col justify-center">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="shrink-0 text-xs/3 font-semibold">素材库</h2>
                        {currentPhoto ? (
                          <span className="shrink-0 text-[10px]/3 font-medium text-muted-foreground tabular-nums">
                            {currentIndex + 1} / {photos.length}
                          </span>
                        ) : null}
                      </div>
                      {currentPhoto ? (
                        <p
                          className="truncate text-[10px]/3 text-muted-foreground"
                          title={currentPhoto.name}
                        >
                          {currentPhoto.name}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                {!collapsed ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => void importViaDirectory()}>
                      <FolderOpen data-icon="inline-start" />
                      导入文件夹
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void importViaDialog()}>
                      <ImageIcon data-icon="inline-start" />
                      导入图片
                    </Button>
                  </div>
                ) : null}
              </div>

              {!collapsed ? (
                <div id="template-assets-content" className="h-[140px] min-h-0 shrink-0">
                  {photos.length === 0 ? (
                    <div className="h-full px-3 pb-3">
                      <CoDropZone
                        onFilesDrop={importViaDrop}
                        className="h-full rounded-none border-border/60 bg-muted/20"
                      >
                        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                          <ImageIcon className="size-5" />
                          <div>
                            <p className="text-xs font-medium">
                              {importState.active ? '图片正在导入中…' : '拖入图片开始边框水印'}
                            </p>
                            <p className="text-[10px]">
                              {importState.active
                                ? '素材会逐步加入当前列表'
                                : '或点击右上角导入本地图片'}
                            </p>
                          </div>
                        </div>
                      </CoDropZone>
                    </div>
                  ) : (
                    <ScrollArea
                      horizontalWheelScroll
                      scrollbarOrientation="horizontal"
                      viewportClassName="[&>div]:h-full"
                      className="h-full w-full overflow-hidden"
                    >
                      <div className="flex h-full w-max min-w-full gap-2 px-3 pb-3">
                        {photos.map((photo, index) => {
                          const active = index === currentIndex;
                          const selected = selectedIds.includes(photo.id);

                          return (
                            <div
                              key={photo.id}
                              className={cn(
                                'group relative size-32 shrink-0 overflow-hidden border bg-card transition-colors',
                                selected || active
                                  ? 'border-primary ring-1 ring-primary/20'
                                  : 'border-border hover:border-primary/40',
                              )}
                            >
                              <button
                                type="button"
                                onClick={(event) =>
                                  activatePhoto(photo.id, index, event.metaKey || event.ctrlKey)
                                }
                                className="flex h-full w-full min-h-0 flex-col text-left"
                              >
                                <div className="relative flex min-h-8 flex-1 items-center justify-center overflow-hidden bg-background/80">
                                  {photo.thumbnailReady ? (
                                    <img
                                      src={photo.thumbnailUrl}
                                      alt={photo.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted/40 px-2 text-center">
                                      <span className="text-[9px] text-muted-foreground">
                                        生成缩略图中
                                      </span>
                                    </div>
                                  )}
                                  {selected || active ? (
                                    <div className="pointer-events-none absolute inset-0 ring-2 ring-primary/60" />
                                  ) : null}
                                </div>
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-popover/90 px-2 py-1.5 opacity-0 backdrop-blur-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                  <p className="truncate text-[10px] font-medium text-popover-foreground">
                                    {photo.name}
                                  </p>
                                </div>
                              </button>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="icon-sm"
                                    className="absolute top-1.5 right-1.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                                    aria-label={`删除 ${photo.name}`}
                                    onClick={() => removePhoto(photo.id)}
                                  >
                                    <Trash2 />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={6}>
                                  删除素材
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </TooltipProvider>
    </BusinessWorkbenchAssetsPane>
  );
}

function TemplatePropertiesPanel({
  activeTemplateId,
  onTemplateChange,
  templateParams,
  onTemplateParamsChange,
  background,
  onBackgroundChange,
  presets,
  onPresetsChange,
  onExportCurrent,
  onExportBatch,
}: {
  activeTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  templateParams: Record<string, unknown>;
  onTemplateParamsChange: (next: Record<string, unknown>) => void;
  background: TemplateBackground;
  onBackgroundChange: (next: TemplateBackground) => void;
  presets: Parameters<typeof TemplateExportPanel>[0]['presets'];
  onPresetsChange: Parameters<typeof TemplateExportPanel>[0]['onPresetsChange'];
  onExportCurrent: Parameters<typeof TemplateExportPanel>[0]['onExportCurrent'];
  onExportBatch: Parameters<typeof TemplateExportPanel>[0]['onExportBatch'];
}) {
  const templateSchema = getBuiltinTemplateSchema(activeTemplateId);

  return (
    <BusinessWorkbenchPropertiesPane>
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
                value={templateParams}
                onChange={onTemplateParamsChange}
              />
            </section>
          ) : null}
          <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
            <TemplatePropsPanel
              schema={{ fields: TEMPLATE_BACKGROUND_FIELDS }}
              value={background}
              onChange={(next) => onBackgroundChange(toTemplateBackground(next))}
              title="背景"
              description="默认值来自当前模板，可自行调整。"
            />
          </section>
          <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
            <TemplateExportPanel
              presets={presets}
              onPresetsChange={onPresetsChange}
              onExportCurrent={onExportCurrent}
              onExportBatch={onExportBatch}
            />
          </section>
          <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
            <TemplateExifCard />
          </section>
        </div>
      </div>
    </BusinessWorkbenchPropertiesPane>
  );
}

/** 去掉扩展名，作为导出文件名主干。 */
function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

export function TemplatePage() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const {
    templateId,
    setTemplateId,
    templateParams,
    setTemplateParams,
    background,
    setBackground,
    presets,
    setPresets,
  } = useTemplatePreviewState();
  const { photos, currentIndex, setCurrentIndex, currentPhoto } = usePhotos();
  // 预览一次只能呈现一个目标比例，取第一个档位
  const previewTarget = resolvePreviewTarget(presets[0]);
  // 导出期间挂起预览自适应，否则它会覆盖导出解算出的 --co-base
  const [capturing, setCapturing] = useState(false);

  /**
   * 构造模板导出上下文。
   *
   * 基准读写落在 snapshot 目标元素上：模板几何全部是 `--co-base` 的倍数，
   * 测量用布局尺寸（offsetWidth/offsetHeight），不受任何外层变换影响。
   */
  const createRunContext = (
    name: string | undefined,
    outputDir: string | null,
  ): ExportRunContext => ({
    baseName: name ? stripExtension(name) : undefined,
    outputDir,
    sizeAdapter: {
      prepare: async (target) => {
        const element = previewRef.current;
        if (!element) {
          return;
        }
        applyRenderSize(element, background, target);
        await waitForDomStability();
      },
    },
  });

  const handleExportCurrent: Parameters<typeof TemplateExportPanel>[0]['onExportCurrent'] = async (
    options,
  ) => {
    if (!previewRef.current) {
      return;
    }

    setCapturing(true);
    try {
      const outputDir = await resolveExportDirectory(options.presets.length);
      await waitForImages(previewRef.current);
      await prepareElementForSnapshot(previewRef.current);
      await exportSingle(
        previewRef.current,
        options,
        currentPhoto?.sourceFile ?? currentPhoto?.path,
        createRunContext(currentPhoto?.name, outputDir),
      );
    } finally {
      setCapturing(false);
    }
  };

  const handleExportBatch: Parameters<typeof TemplateExportPanel>[0]['onExportBatch'] = async (
    options,
  ) => {
    if (!previewRef.current || photos.length === 0) {
      return;
    }

    const originalIndex = currentIndex;

    setCapturing(true);
    try {
      // 输出目录只询问一次，避免逐张弹窗
      const outputDir = await resolveExportDirectory(options.presets.length);

      await runScheduledExports({
        items: photos,
        runner: async (photo, index) => {
          setCurrentIndex(index);
          await new Promise((resolve) => setTimeout(resolve, 120));
          if (!previewRef.current) {
            return;
          }
          await waitForImages(previewRef.current);
          await prepareElementForSnapshot(previewRef.current);
          await exportSingle(
            previewRef.current,
            options,
            photo.sourceFile ?? photo.path,
            createRunContext(photo.name, outputDir),
          );
        },
      });
    } finally {
      setCapturing(false);
      setCurrentIndex(originalIndex);
    }
  };

  return (
    <BusinessWorkbench
      header={<TemplateHeader />}
      assetsResizable={false}
      workspace={
        <BusinessWorkbenchWorkspace>
          <div className="flex h-full w-full min-h-0 min-w-0 items-center justify-center">
            <TemplatePreview
              templateId={templateId}
              params={templateParams}
              background={background}
              targetWidth={previewTarget.width}
              targetHeight={previewTarget.height}
              previewRef={previewRef}
              suspendAutoFit={capturing}
            />
          </div>
        </BusinessWorkbenchWorkspace>
      }
      assets={(assetsState) => <TemplateAssetsPanel {...assetsState} />}
      properties={() => (
        <TemplatePropertiesPanel
          activeTemplateId={templateId}
          onTemplateChange={setTemplateId}
          templateParams={templateParams}
          onTemplateParamsChange={setTemplateParams}
          background={background}
          onBackgroundChange={setBackground}
          presets={presets}
          onPresetsChange={setPresets}
          onExportCurrent={handleExportCurrent}
          onExportBatch={handleExportBatch}
        />
      )}
    />
  );
}
