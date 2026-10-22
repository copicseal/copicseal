import { Loader2 } from 'lucide-react';
import { type ComponentType, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CoWindowHeader } from '@/shared/components/co-window-header';
import { useTranslate } from '@/shared/i18n';
import { findTool, type ToolViewProps } from './registry';

/**
 * 小功能的独立页面。
 *
 * 与「边框」「拼图」同级：已添加的功能在左侧导航栏各占一个图标，点进来就是这里。
 * 功能实现按需加载（`tool.load()`）：ExifTool + 24 MB WASM 这类依赖只在真正进入页面时才拉进来。
 */
export function ToolPage({ toolId }: { toolId: string }) {
  const t = useTranslate();
  const tool = findTool(toolId);
  const [view, setView] = useState<ComponentType<ToolViewProps> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!tool) {
      return;
    }

    let cancelled = false;
    setView(null);
    setFailed(false);

    void tool
      .load()
      .then((mod) => {
        if (!cancelled) {
          setView(() => mod.default);
        }
      })
      .catch((error) => {
        console.error('加载小功能失败:', error);
        if (!cancelled) {
          setFailed(true);
          toast.error(t('common.tools.loadFailed', { name: t(tool.nameKey) }), {
            description: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tool, t]);

  if (!tool) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
        {t('common.tools.notFound')}
      </div>
    );
  }

  const View = view;

  const content = failed ? (
    <p className="text-xs text-muted-foreground">
      {t('common.tools.loadFailed', { name: t(tool.nameKey) })}
    </p>
  ) : View ? (
    <View />
  ) : (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" />
      {t('common.tools.loading')}
    </p>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <CoWindowHeader
        icon={tool.icon}
        title={t(tool.nameKey)}
        description={t(tool.descriptionKey)}
      />

      {/*
        两种布局（见 `ToolDefinition.layout`）：

        - `fill`：内层直接撑满高度，视图自己用 `flex-1` 分配空间（列表/预览吃剩余高度，
          行数变化时页面高度不动）
        - `center`（默认）：外层负责滚动，内层 `min-h-full` + 纵向 `justify-center`。
          这样「内容比可视区矮」时上下左右都居中，而内容变高时内层会随之长高，
          从顶部开始排（不会像 `items-center` 那样把顶部顶到滚动区外面够不到）。
      */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tool.layout === 'full' ? (
          <div className="flex h-full min-h-0 w-full flex-col p-4">{content}</div>
        ) : tool.layout === 'fill' ? (
          <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col p-6">{content}</div>
        ) : (
          <div className="flex min-h-full flex-col justify-center p-6">
            <div className="mx-auto w-full max-w-3xl">{content}</div>
          </div>
        )}
      </div>
    </div>
  );
}
