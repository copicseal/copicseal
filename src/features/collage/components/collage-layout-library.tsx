import { LayoutGrid, Move, Rows3, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { COLLAGE_LAYOUT_GROUPS } from '@/features/collage/layouts';
import { getSlotRect } from '@/features/collage/lib';
import { useCollageStore } from '@/features/collage/store/use-collage-store';
import { usePhotos } from '@/shared/hooks/use-photos';
import { type MessageKey, useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import type { CollageLayout, CollageLayoutMode, CollageLongAlign } from '../types';

const MODE_TABS: Array<{ id: CollageLayoutMode; labelKey: MessageKey; icon: typeof LayoutGrid }> = [
  { id: 'grid', labelKey: 'collage.layoutLibrary.mode.grid', icon: LayoutGrid },
  { id: 'long', labelKey: 'collage.layoutLibrary.mode.long', icon: Rows3 },
  { id: 'free', labelKey: 'collage.layoutLibrary.mode.free', icon: Move },
];

const LONG_SIZE_PRESETS = [720, 1080, 1440, 2048];
/** 与属性面板里导出尺寸的夹取范围一致（64 ~ 12000），保证两边能表达的像素范围相同 */
const LONG_SIZE_MIN = 64;
const LONG_SIZE_MAX = 12000;

const VERTICAL_ALIGN: Array<{ id: CollageLongAlign; labelKey: MessageKey }> = [
  { id: 'start', labelKey: 'collage.layoutLibrary.alignLeft' },
  { id: 'center', labelKey: 'collage.layoutLibrary.alignCenter' },
  { id: 'end', labelKey: 'collage.layoutLibrary.alignRight' },
];

const HORIZONTAL_ALIGN: Array<{ id: CollageLongAlign; labelKey: MessageKey }> = [
  { id: 'start', labelKey: 'collage.layoutLibrary.alignTop' },
  { id: 'center', labelKey: 'collage.layoutLibrary.alignCenter' },
  { id: 'end', labelKey: 'collage.layoutLibrary.alignBottom' },
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
  size = 'md',
}: {
  value: T;
  options: Array<{ id: T; labelKey: MessageKey; icon?: typeof LayoutGrid }>;
  onChange: (value: T) => void;
  className?: string;
  /** sm 给长图那种下级选项用，比顶部的模式 tab 小一档 */
  size?: 'md' | 'sm';
}) {
  const t = useTranslate();
  const compact = size === 'sm';

  return (
    <div
      className={cn(
        'flex min-w-0 items-center rounded-lg bg-muted/50',
        compact ? 'gap-0.5 p-0.5' : 'gap-1 p-1',
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center rounded-md font-medium transition-colors',
              compact ? 'gap-1 px-1.5 py-1 text-[11px]' : 'gap-1.5 px-2 py-1.5 text-xs',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon ? <Icon className={cn('shrink-0', compact ? 'size-3' : 'size-3.5')} /> : null}
            <span className="truncate">{t(option.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 长图参数：方向、对齐、横轴尺寸。 */
function LongLayoutControls() {
  const t = useTranslate();
  const { present, updateCanvas } = useCollageStore();
  const { longDirection, longAlign, longSize } = present.canvas;
  // 输入框用草稿，避免边打字边被夹到区间边界把光标顶掉
  const [sizeText, setSizeText] = useState(String(longSize));

  useEffect(() => {
    setSizeText(String(longSize));
  }, [longSize]);

  const commitSize = () => {
    const parsed = Number.parseInt(sizeText, 10);
    const next = Number.isFinite(parsed)
      ? Math.min(LONG_SIZE_MAX, Math.max(LONG_SIZE_MIN, parsed))
      : longSize;
    setSizeText(String(next));
    if (next !== longSize) updateCanvas({ longSize: next });
  };
  const alignOptions = longDirection === 'vertical' ? VERTICAL_ALIGN : HORIZONTAL_ALIGN;
  const crossLabel =
    longDirection === 'vertical'
      ? t('collage.layoutLibrary.canvasWidth')
      : t('collage.layoutLibrary.canvasHeight');

  return (
    <div className="space-y-4 p-3">
      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground">
          {t('collage.layoutLibrary.direction')}
        </span>
        <SegmentedControl
          value={longDirection}
          onChange={(value) => updateCanvas({ longDirection: value })}
          size="sm"
          options={[
            { id: 'vertical', labelKey: 'collage.layoutLibrary.directionVertical' },
            { id: 'horizontal', labelKey: 'collage.layoutLibrary.directionHorizontal' },
          ]}
        />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground">
          {t('collage.layoutLibrary.align')}
        </span>
        <SegmentedControl
          value={longAlign}
          onChange={(value) => updateCanvas({ longAlign: value })}
          size="sm"
          options={alignOptions}
        />
        <p className="text-[11px] leading-5 text-muted-foreground">
          {longDirection === 'vertical'
            ? t('collage.layoutLibrary.alignHintWidth')
            : t('collage.layoutLibrary.alignHintHeight')}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{crossLabel}</span>
          <div className="flex shrink-0 items-center gap-1">
            <Input
              value={sizeText}
              inputMode="numeric"
              aria-label={crossLabel}
              onChange={(event) => setSizeText(event.target.value)}
              onBlur={commitSize}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              className="h-6 w-16 px-1.5 text-right text-xs"
            />
            <span>px</span>
          </div>
        </div>
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
        {t('collage.layoutLibrary.longHint')}
      </p>
    </div>
  );
}

/** 自由模式说明与快捷操作。 */
function FreeLayoutControls() {
  const t = useTranslate();
  const { present, distributePhotos, resetSlots } = useCollageStore();
  const { photos } = usePhotos();
  const photoIds = useMemo(() => photos.map((photo) => photo.id), [photos]);

  return (
    <div className="space-y-3 p-3">
      <p className="text-[11px] leading-5 text-muted-foreground">
        {t('collage.layoutLibrary.freeHint')}
      </p>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={photoIds.length === 0}
        onClick={() => distributePhotos(photoIds)}
      >
        <Wand2 data-icon="inline-start" />
        {t('collage.layoutLibrary.distribute')}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={present.slotItems.length === 0}
        onClick={resetSlots}
      >
        {t('collage.layoutLibrary.resetAll')}
      </Button>
    </div>
  );
}

export function CollageLayoutLibrary() {
  const t = useTranslate();
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
                <SelectValue placeholder={t('collage.layoutLibrary.jumpTo')} />
              </SelectTrigger>
              <SelectContent>
                {/* 与设置页同理：内边距来自 SelectGroup，裸 item 的高亮会铺满弹层 */}
                <SelectGroup>
                  {COLLAGE_LAYOUT_GROUPS.map((group) => (
                    <SelectItem key={group.group} value={group.group}>
                      {t('collage.layoutLibrary.groupOption', {
                        count: group.count,
                        total: group.layouts.length,
                      })}
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
                  {t('collage.layoutLibrary.group', { count: group.count })}
                </h3>
                <div className="grid grid-cols-2 gap-2 p-2">
                  {group.layouts.map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      title={
                        layout.nameKey ? t(layout.nameKey, { count: layout.count }) : layout.name
                      }
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
                        {layout.nameKey ? t(layout.nameKey, { count: layout.count }) : layout.name}
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
