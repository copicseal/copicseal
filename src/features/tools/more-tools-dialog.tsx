import { Minus, Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTemplateStore } from '@/features/template/store/use-template-store';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { saveEnabledTools } from './lib/tool-settings';
import { findTool, TOOLS, type ToolDefinition } from './registry';

interface MoreToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 打开某个已添加功能的页面：由侧栏负责切路由并关掉面板 */
  onOpenTool: (toolId: string) => void;
}

/**
 * 「更多功能」面板：只负责「加 / 减」。
 *
 * 已添加的功能会出现在**左侧导航栏**里，点进去是独立页面（见 `tool-page.tsx`）——
 * 不在这里展开功能内容，避免「面板里是弹框、侧栏里是页面」两套入口。
 *
 * 布局：**已添加功能**（按配置顺序）在上、**未添加功能**（按注册表顺序）在下；
 * 「管理」切换管理态，管理态下点格子就在两边来回移动（即启用 / 停用）。
 */
export function MoreToolsDialog({ open, onOpenChange, onOpenTool }: MoreToolsDialogProps) {
  const t = useTranslate();
  const enabledTools = useTemplateStore((state) => state.enabledTools);
  const setEnabledTools = useTemplateStore((state) => state.setEnabledTools);
  const [managing, setManaging] = useState(false);

  // 配置里残留的旧 id 会被 findTool 过滤掉，只影响展示
  const addedIds = enabledTools.filter((id) => findTool(id));
  const availableIds = TOOLS.filter((tool) => !addedIds.includes(tool.id)).map((tool) => tool.id);

  const persist = async (next: string[]) => {
    setEnabledTools(next);
    try {
      await saveEnabledTools(next);
    } catch (error) {
      console.error('保存小功能开关失败:', error);
      toast.error(t('common.tools.saveFailed'));
    }
  };

  const renderTile = (tool: ToolDefinition, added: boolean) => {
    const Icon = tool.icon;

    return (
      <button
        key={tool.id}
        type="button"
        title={t(tool.descriptionKey)}
        onClick={() => {
          if (managing) {
            void persist(added ? addedIds.filter((id) => id !== tool.id) : [...addedIds, tool.id]);
            return;
          }

          onOpenTool(tool.id);
        }}
        className={cn(
          'group relative flex flex-col items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2 py-3 text-center transition-colors',
          'hover:border-primary/40 hover:bg-accent/60',
        )}
      >
        <Icon className="size-5 text-foreground/80" />
        <span className="line-clamp-2 text-[11px] leading-4 text-foreground/90">
          {t(tool.nameKey)}
        </span>
        {managing ? (
          <span
            className={cn(
              'absolute top-1 right-1 flex size-4 items-center justify-center rounded-full',
              added ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground',
            )}
          >
            {added ? <Minus className="size-3" /> : <Plus className="size-3" />}
          </span>
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
            {addedIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('common.tools.addedEmpty')}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {addedIds.map((id) => renderTile(findTool(id) as ToolDefinition, true))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-medium text-muted-foreground">
              {t('common.tools.available')}
            </h3>
            {availableIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('common.tools.availableEmpty')}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableIds.map((id) => renderTile(findTool(id) as ToolDefinition, false))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
