import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';

type BgMode = 'none' | 'color' | 'image';

const FILTERS = [
  { key: 'blur', label: '模糊', min: 0, max: 20, unit: 'px' },
  { key: 'brightness', label: '亮度', min: 0, max: 200, unit: '%' },
  { key: 'contrast', label: '对比度', min: 0, max: 200, unit: '%' },
  { key: 'grayscale', label: '灰度', min: 0, max: 100, unit: '%' },
  { key: 'hue-rotate', label: '色相', min: 0, max: 360, unit: '°' },
  { key: 'invert', label: '反转', min: 0, max: 100, unit: '%' },
  { key: 'saturate', label: '饱和度', min: 0, max: 200, unit: '%' },
];

export function CoBackgroundPanel() {
  const [mode, setMode] = useState<BgMode>('none');
  const [filters, setFilters] = useState<Record<string, number>>(
    Object.fromEntries(FILTERS.map((f) => [f.key, 0])),
  );

  return (
    <div className="space-y-3 p-3 text-xs">
      <h4 className="font-semibold text-foreground">背景</h4>

      <div className="space-y-1.5">
        <span className="text-muted-foreground">模式</span>
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as BgMode)}
          className="flex gap-4"
          orientation="horizontal"
        >
          {[
            { value: 'none', label: '无' },
            { value: 'color', label: '纯色' },
            { value: 'image', label: '图片' },
          ].map(({ value, label }) => (
            <div key={value} className="flex items-center gap-1.5">
              <RadioGroupItem value={value} id={`bg-${value}`} />
              <label htmlFor={`bg-${value}`} className="cursor-pointer">
                {label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {mode === 'color' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded border bg-muted" />
            <span className="text-muted-foreground">颜色选择器（待实现）</span>
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground">边距</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">W</span>
              <Slider defaultValue={[0]} min={0} max={200} step={1} />
              <span className="text-[10px] text-muted-foreground">H</span>
              <Slider defaultValue={[0]} min={0} max={200} step={1} />
            </div>
          </div>
        </div>
      )}

      {mode === 'image' && (
        <div className="space-y-2">
          {FILTERS.map((f) => (
            <div key={f.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{f.label}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {filters[f.key]}
                  {f.unit}
                </span>
              </div>
              <Slider
                value={[filters[f.key]]}
                onValueChange={([v]) => setFilters((prev) => ({ ...prev, [f.key]: v }))}
                min={f.min}
                max={f.max}
                step={1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
