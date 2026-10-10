import { RotateCcw } from 'lucide-react';
import { useMemo, useSyncExternalStore } from 'react';
import { usePhotos } from '@/shared/hooks/use-photos';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { usePhotoExif } from '../hooks/use-photo-exif';
import { getUsedExifFieldsSnapshot, subscribeUsedExifFields } from '../lib/used-exif-fields';
import {
  getTemplatePhotoConfig,
  useTemplatePhotoConfig,
  useTemplateStore,
} from '../store/use-template-store';
import { collectUsedExifTokens, EXIF_TEXT_VARIABLES } from '../templates/format-exif-text';

/** 卡片与标题栏按钮共用的状态：当前照片、模板用到的字段、改动值与还原动作。 */
function useExifFieldsEditor() {
  const { currentPhoto } = usePhotos();
  const photoId = currentPhoto?.id ?? null;
  const { exif } = usePhotoExif(currentPhoto);
  const photoConfig = useTemplatePhotoConfig(photoId);
  const resetModifiedExif = useTemplateStore((state) => state.resetModifiedExif);

  // 来源一：模板渲染时真正读过的字段（预览里给 exif 包了代理，这里是自动探测结果）
  const trackedFields = useSyncExternalStore(subscribeUsedExifFields, () =>
    getUsedExifFieldsSnapshot(photoConfig.templateId),
  );

  const usedFields = useMemo(() => {
    // 来源二：参数里写到的 {变量}。这条不依赖照片是否有 EXIF，图片没有拍摄信息时也能列出来供填写
    const used = new Set(collectUsedExifTokens(photoConfig.params ?? {}));

    for (const field of trackedFields) {
      const variable = EXIF_TEXT_VARIABLES.find((item) => item.field === field);
      if (variable) {
        used.add(variable.token);
      }
    }

    return EXIF_TEXT_VARIABLES.filter((variable) => used.has(variable.token));
  }, [photoConfig.params, trackedFields]);

  const overrides = photoConfig.modifiedExif;

  return {
    photoId,
    exif,
    usedFields,
    overrides,
    hasOverride: Object.keys(overrides).length > 0,
    resetAll: () => {
      if (photoId) {
        resetModifiedExif(photoId);
      }
    },
  };
}

/**
 * 卡片标题栏右侧的「全部还原」：只显示图标，文本走悬浮提示；没有改动时不占位。
 */
export function TemplateExifFieldsResetAction() {
  const t = useTranslate();
  const { hasOverride, resetAll } = useExifFieldsEditor();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            // size-5 与标题文字、折叠箭头同高（都对齐到首行中线），避免图标看起来偏上/偏下；
            // 常驻渲染、没有改动时置灰：出现/消失不会再撑高头部把下方内容顶走
            className="size-5"
            disabled={!hasOverride}
            aria-label={t('template.exifFields.resetAll')}
            onClick={resetAll}
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('template.exifFields.resetAll')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * 「EXIF 字段」卡片：只列**当前模板用到的**变量，并允许直接改写。
 *
 * 与旧版 `modifiedExif` 的做法一致：改动值只覆盖用户动过的字段，其余仍取照片自身的 EXIF
 * （渲染与导出取 `解析值 ⊕ 改动值`）。照片读到的其它拍摄参数在原来的 EXIF 信息卡片里，只读。
 */
export function TemplateExifFieldsCard() {
  const t = useTranslate();
  const { photoId, exif, usedFields, overrides } = useExifFieldsEditor();
  const setModifiedExif = useTemplateStore((state) => state.setModifiedExif);

  if (usedFields.length === 0) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        {t('template.exifFields.emptyTemplate')}
      </p>
    );
  }

  if (!photoId) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        {t('template.exifFields.emptyPhoto')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-5 text-muted-foreground">{t('template.exifFields.hint')}</p>

      {usedFields.map((variable) => {
        const modified = variable.field in overrides;
        const value = modified ? overrides[variable.field] : (exif?.[variable.field] ?? '');
        const label = variable.labelKey ? t(variable.labelKey) : variable.label;

        return (
          <div key={variable.token} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-muted-foreground" title={variable.token}>
              {label}
            </span>
            {/* 还原按钮做在输入框内部的后缀位置：右侧内边距恒定，出现/消失都不会让输入框长度突变 */}
            <div className="relative min-w-0 flex-1">
              <Input
                aria-label={label}
                data-exif-field={variable.field}
                className={cn('h-7 pr-8 text-xs', modified && 'border-primary/60 bg-primary/5')}
                value={value ?? ''}
                onChange={(event) => setModifiedExif(photoId, variable.field, event.target.value)}
              />
              {modified ? (
                // 命中区是「无圆角的矩形」，圆角只做在内层视觉上：
                // 直接给按钮加圆角时，圆角切掉的那几像素虽然看着在按钮里却不响应点击
                <button
                  type="button"
                  className="group absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  title={t('template.exifFields.resetField')}
                  aria-label={t('template.exifFields.resetFieldAria', { name: label })}
                  onClick={() => {
                    // 只还原这一个字段：删掉改动值即可回落到照片原值
                    const next = { ...overrides };
                    delete next[variable.field];
                    useTemplateStore.setState((state) => ({
                      configs: {
                        ...state.configs,
                        [photoId]: { ...getTemplatePhotoConfig(photoId), modifiedExif: next },
                      },
                    }));
                  }}
                >
                  <span className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-foreground">
                    <RotateCcw className="size-3" />
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
