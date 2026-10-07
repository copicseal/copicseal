import { LayoutGrid, Move, Rows3, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { COLLAGE_LAYOUT_GROUPS } from '@/features/collage/layouts';
import { getSlotRect } from '@/features/collage/lib';
import { useCollageStore } from '@/features/collage/store/use-collage-store';
import { usePhotos } from '@/shared/hooks/use-photos';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Slider } from '@/shared/ui/slider';
import type { CollageLayout, CollageLayoutMode, CollageLongAlign } from '../types';

const MODE_TABS: Array<{ id: CollageLayoutMode; label: string; icon: typeof LayoutGrid }> = [
  { id: 'grid', label: '网格', icon: LayoutGrid },
  { id: 'long', label: '长图', icon: Rows3 },
  { id: 'free', label: '自由', icon: Move },
];

const LONG_SIZE_PRESETS = [720, 1080, 1440, 2048];

const VERTICAL_ALIGN: Array<{ id: CollageLongAlign; label: string }> = [
  { id: 'start', label: '左对齐' },
  { id: 'center', label: '居中' },
  { id: 'end', label: '右对齐' },
];

const HORIZONTAL_ALIGN: Array<{ id: CollageLongAlign; label: string }> = [
  { id: 'start', label: '上对齐' },
  { id: 'center', label: '居中' },
  { id: 'end', label: '下对齐' },
];

function LayoutThumb({ layout }: { layout: CollageLayout }) {
  return (
    <div className="relative aspect-4/3 w-full overflow-hidden rounded-sm bg-muted/50">
      {layout.slots.map((slot) => {
        const rect = getSlotRect(slot);

        return (
          <div
            key={`${layout.id}-${slot.x}-${slot.y}`}
            className="absolute bg-foreground/30 ring-1 ring-background"
            style={{
              left: `${rect.left}%`,
              top: `${rect.top}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
            }}
          />
        );
      })}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ id: T; label: string; icon?: typeof LayoutGrid }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1 bg-muted/50 p-1', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 长图参数：方向、对齐、横轴尺寸。 */
function LongLayoutControls() {
  const { present, updateCanvas } = useCollageStore();
  const { longDirection, longAlign, longSize } = present.canvas;
  const alignOptions = longDirection === 'vertical' ? VERTICAL_ALIGN : HORIZONTAL_ALIGN;
  const crossLabel = longDirection === 'vertical' ? '画布宽度' : '画布高度';

  return (
    <div className="space-y-4 p-3">
      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground">拼接方向</span>
        <SegmentedControl
          value={longDirection}
          onChange={(value) => updateCanvas({ longDirection: value })}
          options={[
            { id: 'vertical', label: '竖向拼接' },
            { id: 'horizontal', label: '横向拼接' },
          ]}
        />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground">对齐方式</span>
        <SegmentedControl
          value={longAlign}
          onChange={(value) => updateCanvas({ longAlign: value })}
          options={alignOptions}
        />
        <p className="text-[11px] leading-5 text-muted-foreground">
          图片宽度小于{crossLabel}时按这里的方式贴边。
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{crossLabel}</span>
          <span>{longSize}px</span>
        </div>
        <Slider
          value={[longSize]}
          min={320}
          max={2048}
          step={20}
          onValueChange={([value]) => updateCanvas({ longSize: value })}
        />
        <div className="flex flex-wrap gap-1.5">
          {LONG_SIZE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => updateCanvas({ longSize: preset })}
              className={cn(
                'border px-2 py-1 text-[11px]',
                longSize === preset
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <p className="border border-border/70 bg-muted/30 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
        长图按素材列表顺序首尾相接，长度由图片自身的比例决定。想调整顺序，用「选择」工具在画布上拖动某一格即可。
      </p>
    </div>
  );
}

/** 自由模式说明与快捷操作。 */
function FreeLayoutControls() {
  const { present, distributePhotos, resetSlots } = useCollageStore();
  const { photos } = usePhotos();
  const photoIds = useMemo(() => photos.map((photo) => photo.id), [photos]);

  return (
    <div className="space-y-3 p-3">
      <p className="text-[11px] leading-5 text-muted-foreground">
        自由模式里每张图片独立摆放：在画布上直接拖动位置，双击复位到默认位置；大小与圆角在右侧「单格」里调。
      </p>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={photoIds.length === 0}
        onClick={() => distributePhotos(photoIds)}
      >
        <Wand2 data-icon="inline-start" />
        按素材顺序铺开
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={present.slotItems.length === 0}
        onClick={resetSlots}
      >
        复位所有位置
      </Button>
    </div>
  );
}

export function CollageLayoutLibrary() {
  const { present, setLayout, setLayoutMode } = useCollageStore();
  const activeLayoutId = present.layoutId;
  const mode = present.canvas.layoutMode;
  const [jumpGroup, setJumpGroup] = useState('');

  const activeGroup = useMemo(
    () =>
      COLLAGE_LAYOUT_GROUPS.find((group) =>
        group.layouts.some((item) => item.id === activeLayoutId),
      ),
    [activeLayoutId],
  );

  useEffect(() => {
    if (activeGroup) {
      setJumpGroup(activeGroup.group);
    }
  }, [activeGroup]);

  const handleJump = (group: string) => {
    setJumpGroup(group);
    const target = document.getElementById(`collage-layout-group-${group}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-border/80 bg-card/90">
      <div className="shrink-0 border-b border-border/80 p-2">
        <SegmentedControl value={mode} options={MODE_TABS} onChange={setLayoutMode} />
      </div>

      {mode === 'grid' ? (
        <>
          <div className="shrink-0 border-b border-border/80 p-2">
            <Select value={jumpGroup} onValueChange={handleJump}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="跳转到…" />
              </SelectTrigger>
              <SelectContent>
                {/* 与设置页同理：内边距来自 SelectGroup，裸 item 的高亮会铺满弹层 */}
                <SelectGroup>
                  {COLLAGE_LAYOUT_GROUPS.map((group) => (
                    <SelectItem key={group.group} value={group.group}>
                      {group.group}（{group.layouts.length}）
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="min-h-0 min-w-0 flex-1" viewportClassName="[&>div]:!block">
            {COLLAGE_LAYOUT_GROUPS.map((group) => (
              <section key={group.group} id={`collage-layout-group-${group.group}`}>
                <h3 className="sticky top-0 z-10 border-b border-border/60 bg-card/95 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
                  {group.group}
                </h3>
                <div className="grid grid-cols-2 gap-2 p-2">
                  {group.layouts.map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      title={layout.name}
                      onClick={() => setLayout(layout.id)}
                      className={cn(
                        'flex flex-col gap-1 border p-1.5 text-left transition-colors',
                        layout.id === activeLayoutId
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50',
                      )}
                    >
                      <LayoutThumb layout={layout} />
                      <span className="truncate px-0.5 text-[10px] text-muted-foreground">
                        {layout.name}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </ScrollArea>
        </>
      ) : mode === 'long' ? (
        <ScrollArea className="min-h-0 min-w-0 flex-1" viewportClassName="[&>div]:!block">
          <LongLayoutControls />
        </ScrollArea>
      ) : (
        <ScrollArea className="min-h-0 min-w-0 flex-1" viewportClassName="[&>div]:!block">
          <FreeLayoutControls />
        </ScrollArea>
      )}
    </aside>
  );
}
