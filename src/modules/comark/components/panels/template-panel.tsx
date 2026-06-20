import { Bookmark } from 'lucide-react';
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

interface CoTemplatePanelProps {
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  orientation: 'auto' | 'horizontal' | 'vertical';
  onOrientationChange: (o: 'auto' | 'horizontal' | 'vertical') => void;
}

export function CoTemplatePanel({
  fontScale,
  onFontScaleChange,
  orientation,
  onOrientationChange,
}: CoTemplatePanelProps) {
  return (
    <div className="flex flex-col gap-3 p-3 text-xs">
      <h4 className="font-semibold text-foreground">模板</h4>

      <div className="flex items-center gap-2 rounded-md border bg-muted/20 p-2">
        <div className="flex size-8 items-center justify-center rounded bg-primary/10 text-[10px] font-medium text-primary">
          极简
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-medium">极简</div>
          <div className="text-[10px] text-muted-foreground">右下角半透明参数水印</div>
        </div>
        <Button variant="ghost" size="icon-xs" title="保存为预设">
          <Bookmark className="size-2.5" />
        </Button>
      </div>

      <div className="border-t pt-3">
        <span className="text-[10px] font-medium text-muted-foreground">属性</span>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">排版方向</span>
          </div>
          <Select value={orientation} onValueChange={onOrientationChange}>
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
              {fontScale.toFixed(1)}×
            </span>
          </div>
          <Slider
            value={[fontScale]}
            onValueChange={([v]) => onFontScaleChange(v)}
            min={0.5}
            max={2}
            step={0.1}
          />
        </div>
      </div>
    </div>
  );
}
