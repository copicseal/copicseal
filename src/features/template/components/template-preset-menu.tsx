import { Bookmark, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CoPanelSection } from '@/shared/components/co-panel-section';
import { usePhotos } from '@/shared/hooks/use-photos';
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

    toast.success(`已存为配置「${record.name}」`);
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
    toast.success(`已用当前图片覆盖配置「${activePreset.name}」`);
    setActiveId(null);
  };

  const handleRemove = async () => {
    if (!activePreset) {
      return;
    }

    await removePreset(activePreset.id);
    toast.success(`已删除配置「${activePreset.name}」`);
    setActiveId(null);
  };

  const activeUsable = activePreset ? isPresetUsable(activePreset) : false;

  return (
    <CoPanelSection
      title="模板预设"
      description="把当前图片的模板、参数、背景与字体存成一条配置，之后可一键套用到其它图片。"
    >
      <div className="space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between">
              选择配置
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
              存为新配置
            </DropdownMenuItem>
            {presets.length > 0 ? <DropdownMenuSeparator /> : null}
            {/* 模板失效的条目仍可点开：覆盖与删除都要留着出口 */}
            {presets.map((preset) => (
              <DropdownMenuItem key={preset.id} onSelect={() => setActiveId(preset.id)}>
                <Bookmark />
                <span className="min-w-0 flex-1 truncate">{preset.name}</span>
                {isPresetUsable(preset) ? null : (
                  <span className="shrink-0 text-[10px] text-muted-foreground">模板已失效</span>
                )}
              </DropdownMenuItem>
            ))}
            {presets.length === 0 ? (
              <DropdownMenuItem disabled>还没有保存的配置</DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <p className="text-[10px] leading-4 text-muted-foreground">
          最多保存 10 条；改名、排序与删除在设置的「模板预设」里。
        </p>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>存为新配置</DialogTitle>
            <DialogDescription>
              把当前图片的模板、参数、背景与字体存成一条配置，名称以
              {TEMPLATE_PRESET_NAME_MIN} - {TEMPLATE_PRESET_NAME_MAX} 个字符为宜。
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={nameDraft}
            maxLength={TEMPLATE_PRESET_NAME_MAX}
            placeholder="例如 微博图 · 白边"
            onChange={(event) => setNameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && nameReady) {
                void submitCreate();
              }
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreating(false)}>
              取消
            </Button>
            <Button type="button" disabled={!nameReady} onClick={() => void submitCreate()}>
              保存
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
                ? `模板：${activePreset.templateName}`
                : '这条配置用的模板在当前版本里已不存在，只能覆盖或删除。'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 text-xs leading-5 text-muted-foreground">
            <p>【覆盖配置】把当前图片的样式覆盖到这条配置。</p>
            <p>【应用全部】把这条配置应用到所有图片。</p>
            <p>【应用配置】把这条配置应用到当前图片。</p>
            <p>导出档位不属于配置，应用时保持每张图片已有的档位。</p>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="destructive" onClick={() => void handleRemove()}>
              删除
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void handleOverwrite()}>
                覆盖配置
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!activeUsable || photos.length === 0}
                onClick={() =>
                  applyToPhotos(
                    photos.map((photo) => photo.id),
                    `已应用配置到全部 ${photos.length} 张图片`,
                  )
                }
              >
                应用全部
              </Button>
              <Button
                type="button"
                disabled={!activeUsable || !currentPhoto}
                onClick={() => {
                  if (currentPhoto) {
                    applyToPhotos([currentPhoto.id], '已应用配置到当前图片');
                  }
                }}
              >
                应用配置
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoPanelSection>
  );
}
