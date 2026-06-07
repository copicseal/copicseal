import { Bookmark, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const TEMPLATES = [
  { id: 'frame-white', name: '框架白边' },
  { id: 'frameless-round', name: '无框圆角' },
  { id: 'ps-splash', name: 'PS启动窗' },
  { id: 'minimal', name: '极简' },
  { id: 'retro-film', name: '复古胶片' },
  { id: 'modern', name: '现代' },
];

export function CoTemplatePanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState([1]);

  return (
    <div className="space-y-3 p-3 text-xs">
      <h4 className="font-semibold text-foreground">模板</h4>

      <div className="grid grid-cols-2 gap-1.5">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setSelectedId(tpl.id)}
            className={cn(
              'flex aspect-[4/3] flex-col items-center justify-center rounded-md border text-[10px] transition-colors',
              selectedId === tpl.id
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30',
            )}
          >
            <span className="line-clamp-2 px-1 text-center">{tpl.name}</span>
          </button>
        ))}
      </div>

      {selectedId && (
        <>
          <div className="border-t pt-3">
            <span className="text-[10px] font-medium text-muted-foreground">属性</span>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">排版方向</span>
              </div>
              <Select defaultValue="auto">
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="auto">自动</SelectItem>
                    <SelectItem value="horizontal">横版</SelectItem>
                    <SelectItem value="vertical">竖版</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">字体缩放</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {fontScale[0].toFixed(1)}×
                </span>
              </div>
              <Slider value={fontScale} onValueChange={setFontScale} min={0.5} max={2} step={0.1} />
            </div>
          </div>
        </>
      )}

      <div className="border-t pt-3">
        <div className="flex items-center gap-1.5">
          <Select>
            <SelectTrigger className="h-7 flex-1 text-[10px]">
              <SelectValue placeholder="加载预设..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="none">无预设</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon-xs" title="保存为预设">
            <Bookmark className="size-2.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground" title="更多">
            <ChevronDown className="size-2.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
