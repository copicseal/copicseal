import { ImageIcon, LayoutTemplate } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TemplateBackground } from '@/features/template/background';
import { resolveTemplateBackground } from '@/features/template/background';
import { createExportPreset } from '@/features/template/lib/export-preset';
import { applyRenderSize, type RenderTarget } from '@/features/template/lib/render-size';
import { TemplateRuntime } from '@/features/template/runtime';
import {
  getDefaultParams,
  resolveBuiltinTemplate,
} from '@/features/template/runtime/template-registry';
import { DEFAULT_TEMPLATE_ID } from '@/features/template/templates';
import { useElementSize } from '@/shared/hooks/use-element-size';
import { usePhotos } from '@/shared/hooks/use-photos';
import { cn } from '@/shared/lib/utils';
import type { ExportPreset } from '@/shared/types/export';
import { Button } from '@/shared/ui/button';
import { usePhotoExif } from '../hooks/use-photo-exif';
import { TemplateBackgroundFrame } from './template-background-frame';

type TemplateZoomMode = 'fit' | 50 | 100 | 200;

const ZOOM_OPTIONS: TemplateZoomMode[] = ['fit', 50, 100, 200];

/** 百分比档位对应的画布宽度基准：100% 即 800px 画布。 */
const ZOOM_REFERENCE_WIDTH = 800;

interface TemplatePreviewProps {
  templateId: string;
  /** 当前用户参数，渲染前由 TemplateRuntime 按模板自己的 schema 兜底归一 */
  params: Record<string, unknown>;
  background: TemplateBackground;
  /** 预览用的目标尺寸，取第一个导出档位 */
  targetWidth: number;
  targetHeight: number;
  previewRef?: React.RefObject<HTMLDivElement | null>;
  /** 导出期间挂起自适应，避免覆盖导出解算出的尺寸 */
  suspendAutoFit?: boolean;
}

/** 百分比档位换算出的画布宽度。 */
function zoomedWidth(zoomMode: Exclude<TemplateZoomMode, 'fit'>): number {
  return (ZOOM_REFERENCE_WIDTH * zoomMode) / 100;
}

/** 元素内容盒尺寸：clientWidth 含内边距，这里扣掉。 */
function readContentBox(element: HTMLElement): { width: number; height: number } {
  const style = window.getComputedStyle(element);
  return {
    width:
      element.clientWidth -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight),
    height:
      element.clientHeight -
      Number.parseFloat(style.paddingTop) -
      Number.parseFloat(style.paddingBottom),
  };
}

/**
 * 预览该用多大的目标盒。
 *
 * 无背景时画框贴合画布，目标盒只作 contain 约束：fit 直接给可用区，
 * 百分比档位给「固定参考宽度 + 无限高」，表达"宽度精确命中"。
 *
 * 有背景时画框必须是一个确定的盒子，按目标比例装进可用区。
 */
function resolvePreviewRenderTarget(
  zoomMode: TemplateZoomMode,
  background: TemplateBackground,
  targetWidth: number,
  targetHeight: number,
  availableWidth: number,
  availableHeight: number,
): RenderTarget {
  if (background.mode === 'none') {
    if (zoomMode === 'fit') {
      return { width: availableWidth, height: availableHeight };
    }

    return { width: zoomedWidth(zoomMode), height: Number.POSITIVE_INFINITY };
  }

  const ratio = targetWidth / targetHeight;
  const frameWidth =
    zoomMode === 'fit' ? Math.min(availableWidth, availableHeight * ratio) : zoomedWidth(zoomMode);

  return { width: frameWidth, height: frameWidth / ratio };
}

export function TemplatePreview({
  templateId,
  params,
  background,
  targetWidth,
  targetHeight,
  previewRef,
  suspendAutoFit = false,
}: TemplatePreviewProps) {
  const { currentPhoto } = usePhotos();
  const { exif } = usePhotoExif(currentPhoto);
  const [zoomMode, setZoomMode] = useState<TemplateZoomMode>('fit');
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewport = useElementSize(viewportRef);

  const template = resolveBuiltinTemplate(templateId);

  /**
   * 影响渲染尺寸的全部输入。
   *
   * 这些值不直接参与测量计算，但任何一个变化都必须重新自适应；
   * 作为指纹既表达了这层真实依赖，也避免同一状态下重复测量。
   */
  const fitKey = [
    suspendAutoFit ? 'suspend' : 'fit',
    zoomMode,
    templateId,
    currentPhoto?.id ?? '',
    `${Math.round(viewport.width)}x${Math.round(viewport.height)}`,
    JSON.stringify(background),
    `${targetWidth}x${targetHeight}`,
    JSON.stringify(params),
  ].join('|');

  /**
   * 预览自适应：直接改写画框尺寸与 `--co-frame` / `--co-base`，不叠加任何 CSS transform。
   *
   * 画布高度由内容比例决定，所以先探针量一次比例，再线性反解出能装进目标盒的基准。
   * 整个过程在 paint 之前完成，探针值不会被看到。
   */
  useLayoutEffect(() => {
    const element = previewRef?.current;
    const viewportElement = viewportRef.current;
    if (suspendAutoFit || !element || !viewportElement || element.dataset.fitKey === fitKey) {
      return;
    }

    const available = readContentBox(viewportElement);
    if (available.width <= 0 || available.height <= 0) {
      return;
    }

    const target = resolvePreviewRenderTarget(
      zoomMode,
      background,
      targetWidth,
      targetHeight,
      available.width,
      available.height,
    );

    if (!applyRenderSize(element, background, target)) {
      return;
    }

    element.dataset.fitKey = fitKey;
  }, [fitKey, previewRef, suspendAutoFit, background, targetWidth, targetHeight, zoomMode]);

  if (!currentPhoto) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
        <LayoutTemplate className="size-14 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">边框水印预览</h1>
          <p className="mt-2 text-sm leading-6">选择一张图片后，这里会显示真实模板渲染结果。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center gap-5">
      <div
        ref={viewportRef}
        className={cn(
          'flex min-h-0 w-full flex-1 items-center justify-center p-4',
          // 导出期间画布会临时放大到目标尺寸，此时不跟随滚动，避免视口乱跳
          suspendAutoFit ? 'overflow-hidden' : 'overflow-auto',
        )}
      >
        <div ref={previewRef}>
          <TemplateBackgroundFrame background={background} photoUrl={currentPhoto.previewUrl}>
            <TemplateRuntime
              templateId={templateId}
              photoUrl={currentPhoto.previewUrl}
              exif={exif}
              params={params}
            />
          </TemplateBackgroundFrame>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-4 border-t border-border/80 px-4 py-2 text-xs text-muted-foreground">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{currentPhoto.name}</p>
          <p>{(currentPhoto.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ZOOM_OPTIONS.map((option) => {
            const active = zoomMode === option;

            return (
              <Button
                key={option.toString()}
                variant={active ? 'default' : 'outline'}
                size="sm"
                onClick={() => setZoomMode(option)}
              >
                {option === 'fit' ? '适应' : `${option}%`}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <ImageIcon className="size-3.5" />
          <span>{template.meta.name}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Template 页的会话状态。
 *
 * 切换模板时，参数与背景都重置为该模板自己的默认值：不同模板的参数集合互不兼容，
 * 保留旧值只会让属性面板出现与当前模板无关的残留字段。
 */
export function useTemplatePreviewState() {
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);
  const [templateParams, setTemplateParams] = useState<Record<string, unknown>>(() =>
    getDefaultParams(resolveBuiltinTemplate(DEFAULT_TEMPLATE_ID).schema),
  );
  const [background, setBackground] = useState<TemplateBackground>(() =>
    resolveTemplateBackground(resolveBuiltinTemplate(DEFAULT_TEMPLATE_ID).backgroundDefaults),
  );
  const [presets, setPresets] = useState<ExportPreset[]>(() => [createExportPreset()]);

  useEffect(() => {
    const template = resolveBuiltinTemplate(templateId);
    setTemplateParams(getDefaultParams(template.schema));
    setBackground(resolveTemplateBackground(template.backgroundDefaults));
  }, [templateId]);

  return {
    templateId,
    setTemplateId,
    templateParams,
    setTemplateParams,
    background,
    setBackground,
    presets,
    setPresets,
  };
}
