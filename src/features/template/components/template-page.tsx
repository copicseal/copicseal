import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FolderOpen,
  ImageIcon,
  LayoutTemplate,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { prepareElementForSnapshot, waitForDomStability, waitForImages } from '@/core/renderer';
import { runScheduledExports } from '@/core/scheduler';
import {
  DEFAULT_TEMPLATE_BACKGROUND,
  TEMPLATE_BACKGROUND_FIELDS,
  type TemplateBackground,
  toTemplateBackground,
} from '@/features/template/background';
import { isValidPreset } from '@/features/template/lib/export-preset';
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
import { usePageActive } from '@/shared/providers/page-activity-provider';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import {
  PhotoPalettePicker,
  TemplateExifCard,
  TemplateExportPanel,
  TemplatePreview,
  TemplatePropsPanel,
  TemplateSelector,
} from '../exports';
import { ensurePhotoExif } from '../hooks/use-photo-exif';
import { type PhotoPaletteState, usePhotoPalette } from '../hooks/use-photo-palette';
import {
  getTemplatePhotoConfig,
  type TemplateApplyScope,
  useTemplatePhotoConfig,
  useTemplateStore,
} from '../store/use-template-store';

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
    removePhoto,
    importViaDialog,
    importViaDirectory,
    importViaDrop,
    importState,
  } = usePhotos();
  const pageActive = usePageActive();
  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    // 隐藏时注销粘贴监听，避免后台页面响应前台操作。
    if (!pageActive) {
      return;
    }

    const handlePaste = async (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        event.preventDefault();
        await importViaDrop(files);
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [importViaDrop, pageActive]);

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

                    return (
                      <Tooltip key={photo.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`切换到 ${photo.name}`}
                            aria-current={active ? 'true' : undefined}
                            className={cn(
                              'relative flex size-6 shrink-0 items-center justify-center overflow-hidden border bg-background/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                              active
                                ? 'border-primary ring-2 ring-primary/70'
                                : 'border-border/70 hover:border-primary/50',
                            )}
                            onClick={() => setCurrentIndex(index)}
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

                          return (
                            <div
                              key={photo.id}
                              className={cn(
                                'group relative size-32 shrink-0 overflow-hidden border bg-card transition-colors',
                                active
                                  ? 'border-primary ring-1 ring-primary/20'
                                  : 'border-border hover:border-primary/40',
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => setCurrentIndex(index)}
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
                                  {active ? (
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

/**
 * 一键应用按钮。
 *
 * 模板与参数合并成一个动作：参数脱离所属模板没有意义，分开应用只会得到
 * 一份与模板不匹配的残值。
 */
function ApplyToOthersButton({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" size="sm" className="w-full" onClick={onClick}>
      <Copy data-icon="inline-start" />
      {label}（{count} 张）
    </Button>
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
  hasPhoto,
  otherPhotoCount,
  onApplyToOthers,
  palette,
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
  hasPhoto: boolean;
  otherPhotoCount: number;
  onApplyToOthers: (scope: TemplateApplyScope) => void;
  palette: PhotoPaletteState;
}) {
  const templateSchema = getBuiltinTemplateSchema(activeTemplateId);

  if (!hasPhoto) {
    return (
      <BusinessWorkbenchPropertiesPane>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <section className="border border-border/80 bg-background/70 px-4 py-4 text-xs leading-6 text-muted-foreground shadow-sm">
            导入图片后即可调整这张照片的模板、参数、背景与导出档位。
          </section>
        </div>
      </BusinessWorkbenchPropertiesPane>
    );
  }

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
            <section className="space-y-3 border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
              <TemplatePropsPanel
                schema={templateSchema}
                value={templateParams}
                onChange={onTemplateParamsChange}
              />
              {otherPhotoCount > 0 ? (
                <ApplyToOthersButton
                  label="模板与参数应用到其他"
                  count={otherPhotoCount}
                  onClick={() => onApplyToOthers('template')}
                />
              ) : null}
            </section>
          ) : null}
          <section className="space-y-3 border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
            <TemplatePropsPanel
              schema={{ fields: TEMPLATE_BACKGROUND_FIELDS }}
              value={background}
              onChange={(next) => onBackgroundChange(toTemplateBackground(next))}
              title="背景"
              description="默认值来自当前模板，可自行调整。"
              extras={{
                // 主题色盘只挂在颜色字段下：该字段本身只在纯色模式可见
                color: (
                  <PhotoPalettePicker
                    colors={palette.colors}
                    selected={background.color}
                    loading={palette.loading}
                    failed={palette.failed}
                    onPick={(color) => onBackgroundChange({ ...background, color })}
                  />
                ),
              }}
            />
            {otherPhotoCount > 0 ? (
              <ApplyToOthersButton
                label="背景应用到其他"
                count={otherPhotoCount}
                onClick={() => onApplyToOthers('background')}
              />
            ) : null}
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
  const { photos, currentIndex, setCurrentIndex, currentPhoto } = usePhotos();
  // 模板、参数、背景与档位都取自当前照片自己的配置
  const config = useTemplatePhotoConfig(currentPhoto?.id);
  const setTemplate = useTemplateStore((state) => state.setTemplate);
  const setParams = useTemplateStore((state) => state.setParams);
  const setBackground = useTemplateStore((state) => state.setBackground);
  const setPresets = useTemplateStore((state) => state.setPresets);
  const applyToOthers = useTemplateStore((state) => state.applyToOthers);
  const prune = useTemplateStore((state) => state.prune);
  // 导出期间挂起预览自适应，否则它会覆盖导出解算出的 --co-base
  const [capturing, setCapturing] = useState(false);
  const otherPhotoCount = Math.max(photos.length - (currentPhoto ? 1 : 0), 0);

  // 素材被移除后回收它的配置；prune 在无变化时返回原 state，不会引起额外渲染
  useEffect(() => {
    prune(photos.map((photo) => photo.id));
  }, [photos, prune]);

  const palette = usePhotoPalette(currentPhoto);

  /**
   * 纯色背景的默认色。
   *
   * 首次在某张照片上进入纯色模式时，直接把照片的第一个主题色写进背景色：用户不必
   * 点色盘就已经拿到主色调。颜色一旦不等于默认值（说明用户自己挑过），或这张照片
   * 已经补过一次，就不再介入，避免覆盖用户的选择。
   */
  const paletteAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    const photoId = currentPhoto?.id;

    // 导出期间不写配置：批量导出会逐张切换照片，此时必须让导出严格按各自配置渲染
    if (capturing || !photoId) {
      return;
    }

    if (palette.colors.length === 0 || paletteAppliedRef.current === photoId) {
      return;
    }

    if (
      config.background.mode !== 'color' ||
      config.background.color !== DEFAULT_TEMPLATE_BACKGROUND.color
    ) {
      return;
    }

    paletteAppliedRef.current = photoId;
    setBackground(photoId, { ...config.background, color: palette.colors[0] });
  }, [capturing, currentPhoto?.id, palette.colors, config.background, setBackground]);

  /**
   * 构造模板导出上下文。
   *
   * 基准读写落在 snapshot 目标元素上：模板几何全部是 `--co-base` 的倍数，
   * 测量用布局尺寸（offsetWidth/offsetHeight），不受任何外层变换影响。
   * 背景按目标照片自己的配置解算——批量导出时每张图的画框语义可能不同。
   */
  const createRunContext = (
    name: string | undefined,
    outputDir: string | null,
    photoBackground: TemplateBackground,
  ): ExportRunContext => ({
    baseName: name ? stripExtension(name) : undefined,
    outputDir,
    sizeAdapter: {
      prepare: async (target) => {
        const element = previewRef.current;
        if (!element) {
          return;
        }
        applyRenderSize(element, photoBackground, target);
        await waitForDomStability();
      },
    },
  });

  const handleApplyToOthers = (scope: TemplateApplyScope) => {
    if (!currentPhoto || otherPhotoCount === 0) {
      return;
    }

    applyToOthers(
      photos.map((photo) => photo.id),
      currentPhoto.id,
      scope,
    );
    toast.success(
      scope === 'template'
        ? `已把模板与参数应用到其余 ${otherPhotoCount} 张照片`
        : `已把背景应用到其余 ${otherPhotoCount} 张照片`,
    );
  };

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
        createRunContext(currentPhoto?.name, outputDir, config.background),
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
    // 每张照片的档位数可以不同，只要有任意一张是多档就先问一次目录，
    // 避免多档 × 多图产生大量保存对话框
    const maxPresetCount = photos.reduce(
      (max, photo) => Math.max(max, getTemplatePhotoConfig(photo.id).presets.length),
      1,
    );

    setCapturing(true);
    try {
      const outputDir = await resolveExportDirectory(maxPresetCount);
      let skipped = 0;

      await runScheduledExports({
        items: photos,
        runner: async (photo, index) => {
          const photoConfig = getTemplatePhotoConfig(photo.id);
          const presets = photoConfig.presets.filter(isValidPreset);
          if (presets.length === 0) {
            skipped += 1;
            return;
          }

          // 先切到目标照片，预览会按它自己的模板与参数重渲染
          setCurrentIndex(index);
          await new Promise((resolve) => setTimeout(resolve, 120));
          // EXIF 未就绪就抓图，模板里的机型与拍摄参数会是空的
          await ensurePhotoExif(photo);
          if (!previewRef.current) {
            return;
          }
          await waitForImages(previewRef.current);
          await prepareElementForSnapshot(previewRef.current);
          await exportSingle(
            previewRef.current,
            { ...options, presets },
            photo.sourceFile ?? photo.path,
            createRunContext(photo.name, outputDir, photoConfig.background),
          );
        },
      });

      if (skipped > 0) {
        toast.warning(`${skipped} 张照片的档位不完整，已跳过`);
      }
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
              templateId={config.templateId}
              params={config.params}
              background={config.background}
              previewRef={previewRef}
              suspendAutoFit={capturing}
            />
          </div>
        </BusinessWorkbenchWorkspace>
      }
      assets={(assetsState) => <TemplateAssetsPanel {...assetsState} />}
      properties={() => (
        <TemplatePropertiesPanel
          activeTemplateId={config.templateId}
          onTemplateChange={(templateId) => {
            if (currentPhoto) {
              setTemplate(currentPhoto.id, templateId);
            }
          }}
          templateParams={config.params}
          onTemplateParamsChange={(next) => {
            if (currentPhoto) {
              setParams(currentPhoto.id, next);
            }
          }}
          background={config.background}
          onBackgroundChange={(next) => {
            if (currentPhoto) {
              setBackground(currentPhoto.id, next);
            }
          }}
          presets={config.presets}
          onPresetsChange={(next) => {
            if (currentPhoto) {
              setPresets(currentPhoto.id, next);
            }
          }}
          onExportCurrent={handleExportCurrent}
          onExportBatch={handleExportBatch}
          hasPhoto={currentPhoto !== null}
          otherPhotoCount={otherPhotoCount}
          onApplyToOthers={handleApplyToOthers}
          palette={palette}
        />
      )}
    />
  );
}
