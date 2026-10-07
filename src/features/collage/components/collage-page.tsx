import { Grid3x3 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { prepareElementForSnapshot, waitForImages } from '@/core/renderer';
import {
  COLLAGE_QUALITY_VALUES,
  getAspectRatioValue,
  getCanvasDesignWidth,
} from '@/features/collage/lib';
import { applyCollageRenderSize } from '@/features/collage/lib/render-size';
import { useCollageStore } from '@/features/collage/store/use-collage-store';
import {
  exportSingle,
  resolveCollageDefaults,
  resolveExportDirectory,
  resolveExportSizes,
} from '@/platform';
import type { OutputSize } from '@/platform/contracts';
import {
  notifyExportedDirectory,
  notifyExportFailed,
} from '@/shared/components/co-open-directory-link';
import { CoWindowHeader } from '@/shared/components/co-window-header';
import { useElementSize } from '@/shared/hooks/use-element-size';
import { usePhotos } from '@/shared/hooks/use-photos';
import {
  BusinessWorkbench,
  BusinessWorkbenchPropertiesPane,
  BusinessWorkbenchWorkspace,
} from '@/shared/layouts/business-workbench';
import { usePageActive } from '@/shared/providers/page-activity-provider';
import { setImportSelectionSuspended } from '@/shared/providers/photo-provider';
import type { ExportOptions } from '@/shared/types/export';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { CollageAssetsPanel } from './collage-assets-panel';
import { CollageCanvas } from './collage-canvas';
import { CollageLayoutLibrary } from './collage-layout-library';
import { CollagePropertiesPanel } from './collage-properties-panel';
import { CollageToolbar } from './collage-toolbar';

/** 拼图导出文件名的自动命名主干：拼图是整块画布，没有单张原图名可沿用。 */
const COLLAGE_BASE_NAME = '拼图';

export function CollagePage() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const pageActive = usePageActive();
  const { photos, importViaDrop } = usePhotos();
  const {
    present,
    syncPhotos,
    selectedSlotIndex,
    undo,
    redo,
    clearSlot,
    selectSlot,
    setConfigDefaults,
  } = useCollageStore();
  const [exporting, setExporting] = useState(false);
  const [exportSizes, setExportSizes] = useState<readonly OutputSize[]>([]);
  const restoreRef = useRef<(() => void) | null>(null);
  const canvasSize = useElementSize(previewRef);

  const mode = present.canvas.layoutMode;
  const canvas = present.canvas;
  const designWidth = getCanvasDesignWidth(canvas);
  const photoIds = useMemo(() => photos.map((photo) => photo.id), [photos]);

  /**
   * 编辑器快捷键：撤销 / 重做、删除选中格、Esc 取消选中。
   *
   * 只在本页可见时挂监听，并且在输入框里打字时不抢键（属性面板里全是输入框）。
   */
  useEffect(() => {
    if (!pageActive) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // target 可能是 window / document（没有任何元素获得焦点时），别直接点 HTML 属性
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[role="textbox"]'))
      ) {
        return;
      }

      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (modifier && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (modifier && key === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedSlotIndex !== null) {
        event.preventDefault();
        clearSlot(selectedSlotIndex);
        return;
      }

      if (event.key === 'Escape') {
        selectSlot(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearSlot, pageActive, redo, selectSlot, selectedSlotIndex, undo]);

  // 导出用的常用尺寸与「边框水印」共用同一个来源（设置 → 导出 → 常用尺寸）
  useEffect(() => {
    void resolveExportSizes().then(setExportSizes);
  }, []);

  // 设置 → 拼图里的默认值：新建拼图与「恢复默认」都按它来（用户已经摆好的拼图不会被改）
  useEffect(() => {
    void resolveCollageDefaults().then(setConfigDefaults);
  }, [setConfigDefaults]);

  // 粘贴导入：素材直接从剪贴板进来，和模板页保持一致
  useEffect(() => {
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

  // 素材与布局模式变化时对齐槽位：删掉的补洞、新导入的填空位。
  // 只依赖这两者，用户手动清空的格子不会被立刻填回去。
  useEffect(() => {
    syncPhotos(photoIds, mode);
  }, [photoIds, mode, syncPhotos]);

  const canvasRatio = useMemo(() => {
    if (mode === 'long' && canvasSize.height > 0 && canvasSize.width > 0) {
      return canvasSize.width / canvasSize.height;
    }

    return getAspectRatioValue(canvas);
  }, [canvas, canvasSize.height, canvasSize.width, mode]);

  const buildOptions = (): ExportOptions => {
    const { format, quality, scale, width, height } = present.exportSettings;

    return {
      presets: [
        {
          id: 'collage',
          format,
          // 目标框就是面板里的宽高；长图的高度由内容决定，这里给的值只在长图模式下被忽略
          width,
          height,
          scale,
          quality: COLLAGE_QUALITY_VALUES[quality],
        },
      ],
      dpi: 72,
      preserveExif: false,
    };
  };

  const handleExport = async () => {
    const element = previewRef.current;
    if (!element) {
      return;
    }

    setExporting(true);
    // 导出期间别让导入把选中素材切走：拼图虽然只截一次，但画布内容是跟着素材走的
    setImportSelectionSuspended(true);
    try {
      const outputDir = await resolveExportDirectory();
      await waitForImages(element);
      await prepareElementForSnapshot(element);
      console.log(
        '[collage] 开始导出',
        present.exportSettings.width,
        'x',
        present.exportSettings.height,
        '倍率',
        present.exportSettings.scale,
        '画布基准',
        designWidth,
      );

      // 先建好 options：尺寸适配器要在截图前改写 preset 的宽高（导出流程先截图后命名）
      const options = buildOptions();

      await exportSingle(element, options, undefined, {
        baseName: COLLAGE_BASE_NAME,
        outputDir,
        sizeAdapter: {
          prepare: async (target) => {
            const restore = applyCollageRenderSize(element, {
              width: target.width,
              height: target.height,
              crossDesign: designWidth,
              cross:
                mode === 'long'
                  ? present.canvas.longDirection === 'horizontal'
                    ? 'height'
                    : 'width'
                  : undefined,
            });
            restoreRef.current = restore;
            await prepareElementForSnapshot(element);

            // 尺寸已经落定，这里才知道真实的输出像素（长图高度由内容决定、倍率还要乘上去）。
            // 导出流程是「先截图、后用 preset 的宽高命名」，所以此刻改写宽高就能让文件名与落盘内容一致。
            const [preset] = options.presets;
            if (preset) {
              preset.width = Math.round(element.offsetWidth * preset.scale);
              preset.height = Math.round(element.offsetHeight * preset.scale);
            }

            console.log(
              '[collage] 画布已切到导出尺寸',
              element.offsetWidth,
              'x',
              element.offsetHeight,
              '→ 落盘',
              preset?.width,
              'x',
              preset?.height,
            );
          },
        },
      });

      notifyExportedDirectory(outputDir);
    } catch (error) {
      notifyExportFailed(error);
    } finally {
      restoreRef.current?.();
      restoreRef.current = null;
      setExporting(false);
      setImportSelectionSuspended(false);
    }
  };

  return (
    <BusinessWorkbench
      header={<CoWindowHeader icon={Grid3x3} title="拼图" description="多图拼接、单格取景与导出" />}
      toolbar={<CollageToolbar onExport={() => void handleExport()} exporting={exporting} />}
      library={<CollageLayoutLibrary />}
      // 素材区与「边框水印」一致：固定高度、可折叠，不做可拖拽分隔
      assetsResizable={false}
      // 属性面板里有宽高输入与档位按钮，再窄就会被挤到换行
      propertiesMinSize={260}
      workspace={
        <BusinessWorkbenchWorkspace>
          <CollageCanvas previewRef={previewRef} exporting={exporting} />
        </BusinessWorkbenchWorkspace>
      }
      assets={(assetsState) => <CollageAssetsPanel {...assetsState} />}
      properties={() => (
        <BusinessWorkbenchPropertiesPane>
          <ScrollArea className="min-h-0 min-w-0 flex-1" viewportClassName="[&>div]:!block">
            <div className="px-3 py-3">
              <CollagePropertiesPanel
                onExport={() => void handleExport()}
                exporting={exporting}
                canvasRatio={canvasRatio}
                sizes={exportSizes}
                onSizesOpen={() => void resolveExportSizes().then(setExportSizes)}
              />
            </div>
          </ScrollArea>
        </BusinessWorkbenchPropertiesPane>
      )}
    />
  );
}
