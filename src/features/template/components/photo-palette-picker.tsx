import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface PhotoPalettePickerProps {
  colors: string[];
  /** 当前背景色，用于标出选中的色块 */
  selected: string;
  loading: boolean;
  failed: boolean;
  onPick: (color: string) => void;
}

/** 加载中的占位槽位：先占住位置，色盘出现时面板高度不跳动。 */
const PLACEHOLDER_SLOTS = [0, 1, 2, 3, 4];

/** 底色上的对勾取黑或白，保证在任何主题色上都看得清（BT.601 亮度）。 */
function contrastColor(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;

  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#000000' : '#ffffff';
}

/**
 * 照片主题色盘：纯色背景的快捷取色。
 *
 * 色块来自当前照片的主色调（见 `lib/photo-palette`），点击即写入背景色；
 * 提取失败时只留一句提示，手动取色不受影响。
 */
export function PhotoPalettePicker({
  colors,
  selected,
  loading,
  failed,
  onPick,
}: PhotoPalettePickerProps) {
  if (failed) {
    return (
      <p className="text-[10px] leading-4 text-muted-foreground">
        未能提取照片主题色，可直接手动选择颜色。
      </p>
    );
  }

  const active = selected.toLowerCase();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>照片主题色</span>
        <span>{loading ? '提取中…' : '点击直接应用'}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {loading
          ? PLACEHOLDER_SLOTS.map((slot) => (
              <span key={slot} className="h-6 w-8 animate-pulse rounded-sm bg-muted" />
            ))
          : colors.map((color) => {
              const isActive = color.toLowerCase() === active;

              return (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-label={`应用主题色 ${color}`}
                  aria-pressed={isActive}
                  onClick={() => onPick(color)}
                  className={cn(
                    'flex h-6 w-8 items-center justify-center rounded-sm border border-border/70 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/50',
                    isActive && 'ring-2 ring-foreground/40',
                  )}
                  style={{ backgroundColor: color }}
                >
                  {isActive ? (
                    <Check className="size-3.5" style={{ color: contrastColor(color) }} />
                  ) : null}
                </button>
              );
            })}
      </div>
    </div>
  );
}
