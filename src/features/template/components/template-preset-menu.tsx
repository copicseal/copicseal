import { Bookmark, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CoPanelSection } from '@/shared/components/co-panel-section';
import { usePhotos } from '@/shared/hooks/use-photos';
import { useTranslate } from '@/shared/i18n';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { useTemplatePresets } from '../hooks/use-template-presets';
import {
  isPresetUsable,
  MAX_TEMPLATE_PRESETS,
  TEMPLATE_PRESET_NAME_MAX,
  TEMPLATE_PRESET_NAME_MIN,
  type TemplatePresetContent,
} from '../lib/template-preset';
import { useTemplateStore } from '../store/use-template-store';

interface TemplatePresetMenuProps {
  /** 当前照片这套样式：作为「存为新配置」与「覆盖配置」的来源 */
  content: TemplatePresetContent;
}

/**
 * 模板预设的入口。
 *
 * 一条预设 = 模板 + 参数 + 背景 + 字体，放在属性面板最上方而不是顶栏：
 * 它调整的是「这张图的样式」，与旁边的模板、字体属于同一类操作。
 */
export function TemplatePresetMenu({ content }: TemplatePresetMenuProps) {
  const t = useTranslate();
  const { photos, currentPhoto } = usePhotos();
  const applyPreset = useTemplateStore((state) => state.applyPreset);
  const { presets, createPreset, overwritePreset, removePreset } = useTemplatePresets();

  const [creating, setCreating] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const activePreset = presets.find((preset) => preset.id === activeId) ?? null;
  const trimmedName = nameDraft.trim();
  const nameReady =
    trimmedName.length >= TEMPLATE_PRESET_NAME_MIN &&
    trimmedName.length <= TEMPLATE_PRESET_NAME_MAX;

  const submitCreate = async () => {
    const record = await createPreset(nameDraft, content);
    if (!record) {
      return;
    }

    toast.success(t('templateExport.toast.saved', { name: record.name }));
    setCreating(false);
  };

  const applyToPhotos = (photoIds: readonly string[], message: string) => {
    if (!activePreset) {
      return;
    }

    applyPreset(photoIds, activePreset);
    toast.success(message);
    setActiveId(null);
  };

  const handleOverwrite = async () => {
    if (!activePreset) {
      return;
    }

    await overwritePreset(activePreset.id, content);
    toast.success(t('templateExport.toast.overwritten', { name: activePreset.name }));
    setActiveId(null);
  };

  const handleRemove = async () => {
    if (!activePreset) {
      return;
    }

    await removePreset(activePreset.id);
    toast.success(t('templateExport.toast.removed', { name: activePreset.name }));
    setActiveId(null);
  };

  const activeUsable = activePreset ? isPresetUsable(activePreset) : false;

  return (
    <CoPanelSection
      title={t('templateExport.presetMenu.title')}
      description={t('templateExport.presetMenu.description')}
    >
      <div className="space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between">
              {t('templateExport.presetMenu.select')}
              <ChevronDown data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          {/*
            菜单里的每一项都会弹对话框：菜单关闭时 Radix 默认把焦点还给触发器，
            那一下会把刚打开的对话框（以及里面 autoFocus 的输入框）抢走焦点，
            所以这里统一拦掉，焦点交给对话框自己管。
          */}
          <DropdownMenuContent align="start" onCloseAutoFocus={(event) => event.preventDefault()}>
            <DropdownMenuItem
              onSelect={() => {
                setNameDraft('');
                setCreating(true);
              }}
            >
              <Plus />
              {t('templateExport.presetMenu.create')}
            </DropdownMenuItem>
            {presets.length > 0 ? <DropdownMenuSeparator /> : null}
            {/* 模板失效的条目仍可点开：覆盖与删除都要留着出口 */}
            {presets.map((preset) => (
              <DropdownMenuItem key={preset.id} onSelect={() => setActiveId(preset.id)}>
                <Bookmark />
                <span className="min-w-0 flex-1 truncate">{preset.name}</span>
                {isPresetUsable(preset) ? null : (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {t('templateExport.presetMenu.invalidTemplate')}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            {presets.length === 0 ? (
              <DropdownMenuItem disabled>{t('templateExport.presetMenu.empty')}</DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <p className="text-[10px] leading-4 text-muted-foreground">
          {t('templateExport.presetMenu.presetLimitHint', { count: MAX_TEMPLATE_PRESETS })}
        </p>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templateExport.presetMenu.create')}</DialogTitle>
            <DialogDescription>
              {t('templateExport.presetMenu.createDescription', {
                min: TEMPLATE_PRESET_NAME_MIN,
                max: TEMPLATE_PRESET_NAME_MAX,
              })}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={nameDraft}
            maxLength={TEMPLATE_PRESET_NAME_MAX}
            placeholder={t('templateExport.presetMenu.namePlaceholder')}
            onChange={(event) => setNameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && nameReady) {
                void submitCreate();
              }
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreating(false)}>
              {t('templateExport.presetMenu.cancel')}
            </Button>
            <Button type="button" disabled={!nameReady} onClick={() => void submitCreate()}>
              {t('templateExport.presetMenu.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activePreset !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activePreset?.name ?? ''}</DialogTitle>
            <DialogDescription>
              {activePreset && activeUsable
                ? t('templateExport.presetMenu.templateLabel', {
                    name: activePreset.templateName ?? '',
                  })
                : t('templateExport.presetMenu.invalidTemplateDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 text-xs leading-5 text-muted-foreground">
            <p>{t('templateExport.presetMenu.overwriteHint')}</p>
            <p>{t('templateExport.presetMenu.applyAllHint')}</p>
            <p>{t('templateExport.presetMenu.applyCurrentHint')}</p>
            <p>{t('templateExport.presetMenu.exportPresetHint')}</p>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="destructive" onClick={() => void handleRemove()}>
              {t('templateExport.presetMenu.remove')}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void handleOverwrite()}>
                {t('templateExport.presetMenu.overwrite')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!activeUsable || photos.length === 0}
                onClick={() =>
                  applyToPhotos(
                    photos.map((photo) => photo.id),
                    t('templateExport.toast.appliedAll', { count: photos.length }),
                  )
                }
              >
                {t('templateExport.presetMenu.applyAll')}
              </Button>
              <Button
                type="button"
                disabled={!activeUsable || !currentPhoto}
                onClick={() => {
                  if (currentPhoto) {
                    applyToPhotos([currentPhoto.id], t('templateExport.toast.appliedCurrent'));
                  }
                }}
              >
                {t('templateExport.presetMenu.applyCurrent')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoPanelSection>
  );
}
