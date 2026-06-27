import { Grid2x2, Grid3x3, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePhotos } from '@/hooks/usePhotos';
import { useCollageStore } from '@/modules/collage/store/use-collage-store';

const GRID_PRESETS = [
  { label: '2 Grid', layoutId: 'two-columns', icon: Grid2x2 },
  { label: '3 Grid', layoutId: 'three-columns', icon: Grid3x3 },
  { label: '4 Grid', layoutId: 'four-grid', icon: LayoutGrid },
  { label: '6 Grid', layoutId: 'six-grid', icon: LayoutGrid },
] as const;

function getAutoLayoutId(photoCount: number) {
  if (photoCount >= 6) {
    return 'six-grid';
  }
  if (photoCount === 5) {
    return 'five-top-two-bottom-three';
  }
  if (photoCount === 4) {
    return 'four-grid';
  }
  if (photoCount === 3) {
    return 'three-columns';
  }
  if (photoCount === 2) {
    return 'two-columns';
  }

  return 'solo-full';
}

export function CollageToolbar() {
  const { photos } = usePhotos();
  const { present, setLayout, updateCanvas } = useCollageStore();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {GRID_PRESETS.map((preset) => {
        const Icon = preset.icon;
        const active = present.canvas.layoutMode === 'grid' && present.layoutId === preset.layoutId;

        return (
          <Button
            key={preset.layoutId}
            variant={active ? 'default' : 'outline'}
            size="sm"
            className="rounded-full px-3"
            onClick={() => {
              updateCanvas({ layoutMode: 'grid' });
              setLayout(preset.layoutId);
            }}
          >
            <Icon data-icon="inline-start" />
            {preset.label}
          </Button>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        className="rounded-full px-3"
        onClick={() => {
          updateCanvas({ layoutMode: 'grid' });
          setLayout(getAutoLayoutId(photos.length));
        }}
      >
        Auto Layout
      </Button>

      <Button
        variant={present.canvas.layoutMode === 'free' ? 'default' : 'outline'}
        size="sm"
        className="rounded-full px-3"
        onClick={() => updateCanvas({ layoutMode: 'free' })}
      >
        Free Layout
      </Button>
    </div>
  );
}
