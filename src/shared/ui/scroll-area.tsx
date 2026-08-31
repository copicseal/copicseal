import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/shared/lib/utils';

type ScrollbarOrientation = 'none' | 'vertical' | 'horizontal' | 'both';

function ScrollArea({
  className,
  children,
  horizontalWheelScroll = false,
  scrollbarOrientation = 'vertical',
  viewportClassName,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  horizontalWheelScroll?: boolean;
  scrollbarOrientation?: ScrollbarOrientation;
  viewportClassName?: string;
}) {
  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (
      !horizontalWheelScroll ||
      event.ctrlKey ||
      Math.abs(event.deltaY) <= Math.abs(event.deltaX)
    ) {
      return;
    }

    const viewport = event.currentTarget;
    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;

    if (maxScrollLeft <= 0) {
      return;
    }

    const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, viewport.scrollLeft + event.deltaY));

    if (nextScrollLeft === viewport.scrollLeft) {
      return;
    }

    event.preventDefault();
    viewport.scrollLeft = nextScrollLeft;
  };

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        onWheel={handleWheel}
        className={cn(
          'size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1',
          viewportClassName,
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {scrollbarOrientation === 'vertical' || scrollbarOrientation === 'both' ? (
        <ScrollBar orientation="vertical" />
      ) : null}
      {scrollbarOrientation === 'horizontal' || scrollbarOrientation === 'both' ? (
        <ScrollBar orientation="horizontal" />
      ) : null}
      {scrollbarOrientation === 'both' ? <ScrollAreaPrimitive.Corner /> : null}
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        'flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
