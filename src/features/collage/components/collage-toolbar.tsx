import { Download, Eraser, Hand, Loader2, MousePointer2, Redo2, Undo2, Wand2 } from 'lucide-react';
import { useMemo } from 'react';
import { useCollageStore } from '@/features/collage/store/use-collage-store';
import { usePhotos } from '@/shared/hooks/use-photos';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

interface CollageToolbarProps {
  onExport: () => void;
  exporting: boolean;
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

export function CollageToolbar({ onExport, exporting }: CollageToolbarProps) {
  const { photos } = usePhotos();
  const { past, future, tool, setTool, undo, redo, fillEmptySlots, resetSlots, present } =
    useCollageStore();
  const photoIds = useMemo(() => photos.map((photo) => photo.id), [photos]);
  const hasPhotos = photoIds.length > 0;
  const hasSlots = present.slotItems.some((slot) => slot.photoId);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border/80 bg-background/96 px-3 py-2">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="撤销"
        disabled={past.length === 0}
        onClick={undo}
      >
        <Undo2 />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="重做"
        disabled={future.length === 0}
        onClick={redo}
      >
        <Redo2 />
      </Button>

      <Divider />

      <div className="flex items-center gap-1 bg-muted/50 p-0.5">
        <button
          type="button"
          title="选择：拖动画面换位"
          onClick={() => setTool('select')}
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-xs',
            tool === 'select'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <MousePointer2 className="size-3.5" />
          选择
        </button>
        <button
          type="button"
          title="平移：拖动画面调整单格取景，滚轮缩放，双击复位"
          onClick={() => setTool('pan')}
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-xs',
            tool === 'pan'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Hand className="size-3.5" />
          平移
        </button>
      </div>

      <Divider />

      <Button
        variant="ghost"
        size="sm"
        disabled={!hasPhotos}
        title="只把还没放进去的素材补进空位，已有格子的取景与缩放保持不动"
        onClick={() => fillEmptySlots(photoIds)}
      >
        <Wand2 data-icon="inline-start" />
        补齐空位
      </Button>
      <Button variant="ghost" size="sm" disabled={!hasSlots} onClick={resetSlots}>
        <Eraser data-icon="inline-start" />
        复位画面
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-[11px] text-muted-foreground md:inline">
          {tool === 'pan' ? '拖动调整取景 · 滚轮缩放 · 双击复位' : '拖动画面换位 · 双击复位'}
        </span>
        <Button size="sm" disabled={exporting || !hasSlots} onClick={onExport}>
          {exporting ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Download data-icon="inline-start" />
          )}
          导出
        </Button>
      </div>
    </div>
  );
}
