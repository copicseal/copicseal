import { ImagePlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePhotos } from '@/hooks/usePhotos';
import { cn } from '@/lib/utils';
import { COLLAGE_LAYOUTS } from '@/modules/collage/layouts';
import { getAspectRatioText, getAspectRatioValue } from '@/modules/collage/lib';
import { useCollageStore } from '@/modules/collage/store/use-collage-store';

function useElementSize<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export function CollageCanvas() {
  const { photos, currentPhoto } = usePhotos();
  const { present, selectedSlotIndex, selectSlot, assignPhotoToSlot, commit } = useCollageStore();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportSize = useElementSize(viewportRef);

  const layout = useMemo(
    () => COLLAGE_LAYOUTS.find((item) => item.id === present.layoutId) ?? COLLAGE_LAYOUTS[0],
    [present.layoutId],
  );
  const ratioValue = getAspectRatioValue(present.canvas);
  const frameWidth = useMemo(() => {
    const availableWidth = Math.max(viewportSize.width - 48, 280);
    const availableHeight = Math.max(viewportSize.height - 48, 280);
    const widthFromHeight = availableHeight * ratioValue;
    return Math.max(280, Math.min(availableWidth, widthFromHeight));
  }, [ratioValue, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    const validPhotoIds = new Set(photos.map((photo) => photo.id));

    commit((draft) => {
      const usedPhotoIds = new Set<string>();

      draft.slotItems = draft.slotItems.map((slot) => {
        if (slot.photoId && validPhotoIds.has(slot.photoId) && !usedPhotoIds.has(slot.photoId)) {
          usedPhotoIds.add(slot.photoId);
          return slot;
        }

        return {
          ...slot,
          photoId: null,
        };
      });

      const availablePhotoIds = photos
        .map((photo) => photo.id)
        .filter((photoId) => !usedPhotoIds.has(photoId));

      draft.slotItems = draft.slotItems.map((slot) => {
        if (slot.photoId || availablePhotoIds.length === 0) {
          return slot;
        }

        const nextPhotoId = availablePhotoIds.shift() ?? null;
        return {
          ...slot,
          photoId: nextPhotoId,
        };
      });
    });
  }, [commit, photos]);

  if (photos.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
        <ImagePlus className="size-14 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Collage Preview</h1>
          <p className="mt-2 text-sm leading-6">导入图片后，这里会显示真实拼图预览结果。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 text-xs text-muted-foreground">
        <span>
          当前布局 {layout.name} · {layout.count} 格
        </span>
        <span>画布比例 {getAspectRatioText(present.canvas)}</span>
      </div>

      <div ref={viewportRef} className="flex min-h-0 flex-1 items-center justify-center p-4">
        <div
          className="border border-border/80 bg-white/80 p-4 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.32)]"
          style={{
            width: `${frameWidth + 32}px`,
            maxWidth: '100%',
          }}
        >
          <div
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: ratioValue,
              backgroundColor: present.canvas.backgroundColor,
              backgroundImage: present.canvas.backgroundImage
                ? `linear-gradient(rgba(255,255,255,0.16), rgba(255,255,255,0.16)), url(${present.canvas.backgroundImage})`
                : undefined,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          >
            <div
              className="absolute inset-0 grid"
              style={{
                gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                gridTemplateRows: 'repeat(12, minmax(0, 1fr))',
                gap: present.canvas.gap,
                padding: present.canvas.padding,
              }}
            >
              {present.slotItems.map((slotItem, index) => {
                const photo = slotItem.photoId
                  ? (photos.find((item) => item.id === slotItem.photoId) ?? null)
                  : null;

                return (
                  <button
                    key={`${layout.id}-${index}`}
                    type="button"
                    className={cn(
                      'group relative overflow-hidden bg-muted/35 text-left transition-colors',
                      selectedSlotIndex === index
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'hover:bg-muted/50',
                    )}
                    style={{
                      gridColumn: `${layout.slots[index].x + 1} / span ${layout.slots[index].w}`,
                      gridRow: `${layout.slots[index].y + 1} / span ${layout.slots[index].h}`,
                      borderRadius: present.canvas.borderRadius,
                    }}
                    onClick={() => {
                      if (!photo && currentPhoto) {
                        assignPhotoToSlot(index, currentPhoto.id);
                      }
                      selectSlot(index);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const photoId = event.dataTransfer.getData('text/copicseal-photo-id');
                      if (photoId) {
                        assignPhotoToSlot(index, photoId);
                      }
                      selectSlot(index);
                    }}
                  >
                    {photo ? (
                      <img
                        src={photo.previewUrl}
                        alt={photo.name}
                        className="h-full w-full object-cover"
                        style={{
                          transform: `translate(${slotItem.offsetX}px, ${slotItem.offsetY}px) scale(${slotItem.scale}) rotate(${slotItem.rotation}deg)`,
                        }}
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ImagePlus className="size-5" />
                        <span className="text-xs">点击填充当前图片</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
