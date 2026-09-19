import { ImageIcon, LayoutTemplate, Loader2 } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { TemplateBackground } from '@/features/template/background';
import { applyRenderSize, type RenderTarget } from '@/features/template/lib/render-size';
import { TemplateRuntime } from '@/features/template/runtime';
import { resolveBuiltinTemplate } from '@/features/template/runtime/template-registry';
import { useElementSize } from '@/shared/hooks/use-element-size';
import { usePhotos } from '@/shared/hooks/use-photos';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
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

/**
 * 画布与预览视口之间的留白（px）。
 *
 * 同一个值既要作为滚动内容的 padding，又要从视口尺寸里扣掉才是画布的可用区，
 * 两边必须同源，因此不写成 Tailwind 的 `p-*`，避免改了类名忘了改解算。
 */
const PREVIEW_GUTTER = 16;

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
   * 可用区取滚动视口扣掉留白后的内容盒，与滚动内容的 padding 完全一致。
   * 整个过程在 paint 之前完成，探针值不会被看到。
   */
  useLayoutEffect(() => {
    const element = previewRef?.current;
    if (!element) {
      return;
    }

    if (suspendAutoFit) {
      // 导出期会按输出尺寸改写画布，此时必须先作废指纹：否则导出结束后
      // fitKey 与导出前完全一致，自适应会被判成"无需重算"，画布就停在导出尺寸上
      delete element.dataset.fitKey;
      return;
    }

    if (element.dataset.fitKey === fitKey) {
      return;
    }

    const available = {
      width: viewport.width - PREVIEW_GUTTER * 2,
      height: viewport.height - PREVIEW_GUTTER * 2,
    };
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
  }, [
    fitKey,
    previewRef,
    suspendAutoFit,
    background,
    targetWidth,
    targetHeight,
    zoomMode,
    viewport.width,
    viewport.height,
  ]);

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
    <div className="flex h-full w-full flex-col items-center">
      <div className="relative flex min-h-0 w-full flex-1">
        <ScrollArea
          viewportRef={viewportRef}
          // 导出期间画布会临时放大到目标尺寸，此时不显示滚动条，避免预览抖动
          scrollbarOrientation={suspendAutoFit ? 'none' : 'both'}
          className="min-h-0 w-full flex-1"
        >
          <div
            className="box-border flex items-center justify-center"
            style={{
              padding: PREVIEW_GUTTER,
              // 最小尺寸等于视口：装得下时居中，装不下时随内容一起增长而不是被裁掉。
              // 向下取整，避免亚像素让滚动区凭空多出 1px 而出现滚动条
              minWidth: Math.floor(viewport.width),
              minHeight: Math.floor(viewport.height),
            }}
          >
            {/* 画框描边与投影只作预览提示，画在快照目标之外，不会进入导出结果 */}
            <div className="shadow-xl ring-1 ring-foreground/15">
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
          </div>
        </ScrollArea>

        {/*
          导出期间画布会被临时放大到输出尺寸，整个过程（含写盘）都停在这个状态。
          盖一层遮罩把这段尺寸变化挡掉，否则用户看到的是预览被拉大后又弹回。
        */}
        {suspendAutoFit ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/85 text-xs text-muted-foreground backdrop-blur-[1px]">
            <Loader2 className="size-4 animate-spin text-primary" />
            正在导出…
          </div>
        ) : null}
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
