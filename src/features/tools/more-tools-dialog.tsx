import { Lock, Minus, Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { NAV_ENTRIES, type NavEntry, type NavSettings, visibleNavEntries } from '@/app/nav-entries';
import type { AppRoute } from '@/app/routes';
import { useTemplateStore } from '@/features/template/store/use-template-store';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { saveNavSettings } from './lib/tool-settings';

interface MoreToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前所在页面：用来判断被隐藏的是不是「用户正看着的那一页」 */
  activeRoute: AppRoute;
  /** 当前页面被隐藏时通知侧栏离开它（回到默认页） */
  onActiveEntryHidden: () => void;
  /** 打开某个入口：由侧栏负责切路由并关掉面板 */
  onOpenEntry: (entryId: string) => void;
}

/**
 * 「更多功能」面板：只负责「加 / 减」。
 *
 * 已显示的入口会出现在**左侧导航栏**里，点进去是独立页面（见 `tool-page.tsx`）——
 * 不在这里展开功能内容，避免「面板里是弹框、侧栏里是页面」两套入口。
 *
 * 入口分两类（`src/app/nav-entries.ts`）：一级页面与「更多功能」里的小工具。
 * 常驻页面也列在这里，用户不必记得「哪个功能只在侧栏、哪个只在面板」：
 * 「边框水印」是主界面，**不可隐藏**（管理态显示锁）；「拼图」可隐藏，默认显示。
 *
 * 布局：**已显示入口**（按侧栏顺序）在上、**未显示入口**（按注册表顺序）在下；
 * 「管理」切换管理态，管理态下点格子就在两边来回移动（即显示 / 隐藏）。
 */
export function MoreToolsDialog({
  open,
  onOpenChange,
  activeRoute,
  onActiveEntryHidden,
  onOpenEntry,
}: MoreToolsDialogProps) {
  const t = useTranslate();
  const enabledTools = useTemplateStore((state) => state.enabledTools);
  const setEnabledTools = useTemplateStore((state) => state.setEnabledTools);
  const hiddenNavEntries = useTemplateStore((state) => state.hiddenNavEntries);
  const setHiddenNavEntries = useTemplateStore((state) => state.setHiddenNavEntries);
  const [managing, setManaging] = useState(false);

  const settings: NavSettings = { enabledTools, hiddenEntries: hiddenNavEntries };
  // 已显示的入口：与侧栏同一份顺序（边框水印 → 拼图 → 已启用的小功能）
  const addedEntries = visibleNavEntries(settings);
  const addedIds = addedEntries.map((entry) => entry.id);
  // 能进「未显示」的只有可隐藏入口：边框水印没有这个状态
  const availableEntries = NAV_ENTRIES.filter(
    (entry) => entry.hideable && !addedIds.includes(entry.id),
  );

  const persist = async (next: NavSettings) => {
    setEnabledTools(next.enabledTools);
    setHiddenNavEntries(next.hiddenEntries);
    try {
      await saveNavSettings(next);
    } catch (error) {
      console.error('保存入口显隐设置失败:', error);
      toast.error(t('common.tools.saveFailed'));
    }
  };

  /**
   * 显示 / 隐藏一个入口。
   *
   * 小功能记「启用列表」（加进去就显示），常驻页面记「隐藏列表」（默认显示、点了才记），
   * 两个列表分开走，老配置升级上来才不会突然少一个入口。
   */
  const toggleEntry = (entry: NavEntry, added: boolean) => {
    if (!entry.hideable) {
      toast.info(t('common.tools.lockedHint'));
      return;
    }

    if (entry.kind === 'tool') {
      void persist({
        enabledTools: added
          ? enabledTools.filter((id) => id !== entry.id)
          : [...enabledTools, entry.id],
        hiddenEntries: hiddenNavEntries,
      });
    } else {
      void persist({
        enabledTools,
        hiddenEntries: added
          ? [...hiddenNavEntries, entry.id]
          : hiddenNavEntries.filter((id) => id !== entry.id),
      });
    }

    // 隐藏掉的正好是用户当前所在的页面：让侧栏把人送回默认页，
    // 否则会停在「侧栏已经没有这个入口、也点不回自己」的页面上
    if (added && entry.route === activeRoute) {
      onActiveEntryHidden();
    }
  };

  const renderTile = (entry: NavEntry, added: boolean) => {
    const Icon = entry.icon;

    return (
      <button
        key={entry.id}
        type="button"
        title={t(entry.descriptionKey)}
        onClick={() => {
          if (managing) {
            toggleEntry(entry, added);
            return;
          }

          onOpenEntry(entry.id);
        }}
        className={cn(
          'group relative flex flex-col items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2 py-3 text-center transition-colors',
          'hover:border-primary/40 hover:bg-accent/60',
        )}
      >
        <Icon className="size-5 text-foreground/80" />
        <span className="line-clamp-2 text-[11px] leading-4 text-foreground/90">
          {t(entry.nameKey)}
        </span>
        {managing ? (
          entry.hideable ? (
            <span
              className={cn(
                'absolute top-1 right-1 flex size-4 items-center justify-center rounded-full',
                added ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground',
              )}
            >
              {added ? <Minus className="size-3" /> : <Plus className="size-3" />}
            </span>
          ) : (
            // 不可隐藏：管理态里用小锁代替 +/−，点了会提示原因
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="size-3" />
            </span>
          )
        ) : null}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('common.tools.title')}</DialogTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute top-3 right-10"
            onClick={() => setManaging((value) => !value)}
          >
            <Settings2 data-icon="inline-start" />
            {managing ? t('common.tools.manageDone') : t('common.tools.manage')}
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-[11px] font-medium text-muted-foreground">
              {t('common.tools.added')}
            </h3>
            {addedEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('common.tools.addedEmpty')}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {addedEntries.map((entry) => renderTile(entry, true))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-medium text-muted-foreground">
              {t('common.tools.available')}
            </h3>
            {availableEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('common.tools.availableEmpty')}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableEntries.map((entry) => renderTile(entry, false))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
