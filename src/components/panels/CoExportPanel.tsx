import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

type ExportFormat = 'jpeg' | 'png' | 'webp';

export function CoExportPanel() {
  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [isOriginal, setIsOriginal] = useState(false);
  const [scale, setScale] = useState([1]);
  const [quality, setQuality] = useState([80]);
  const [dpi, setDpi] = useState('72');
  const [outputPath] = useState('~/Documents/Copicseal');

  return (
    <div className="space-y-4 p-3 text-xs">
      <h4 className="font-semibold text-foreground">导出</h4>

      <div className="space-y-1.5">
        <span className="text-muted-foreground">格式</span>
        <RadioGroup
          value={format}
          onValueChange={(v) => setFormat(v as ExportFormat)}
          className="flex gap-4"
          orientation="horizontal"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="jpeg" id="fmt-jpeg" />
            <label htmlFor="fmt-jpeg" className="cursor-pointer">
              JPEG
            </label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="png" id="fmt-png" />
            <label htmlFor="fmt-png" className="cursor-pointer">
              PNG
            </label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="webp" id="fmt-webp" />
            <label htmlFor="fmt-webp" className="cursor-pointer">
              WebP
            </label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">尺寸</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">原始尺寸</span>
            <Switch
              checked={isOriginal}
              onCheckedChange={setIsOriginal}
              size="sm"
              id="original-size"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1">
            <span className="text-[10px] text-muted-foreground">W</span>
            <Input
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="0"
              disabled={isOriginal}
              className="h-7 px-1.5 text-xs"
            />
          </div>
          <span className="text-muted-foreground">×</span>
          <div className="flex flex-1 items-center gap-1">
            <span className="text-[10px] text-muted-foreground">H</span>
            <Input
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="0"
              disabled={isOriginal}
              className="h-7 px-1.5 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">缩放</span>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {scale[0].toFixed(1)}×
          </span>
        </div>
        <Slider value={scale} onValueChange={setScale} min={0.5} max={3} step={0.1} />
      </div>

      {format !== 'png' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">质量</span>
            <span className="text-[10px] tabular-nums text-muted-foreground">{quality[0]}</span>
          </div>
          <Slider value={quality} onValueChange={setQuality} min={1} max={100} step={1} />
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-muted-foreground">DPI</span>
        <div className="flex items-center gap-2">
          <Input
            value={dpi}
            onChange={(e) => setDpi(e.target.value)}
            className="h-7 flex-1 px-1.5 text-xs"
          />
          <Select value={dpi} onValueChange={setDpi}>
            <SelectTrigger className="h-7 w-16 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="72">72</SelectItem>
                <SelectItem value="150">150</SelectItem>
                <SelectItem value="300">300</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">预设</span>
          <Button variant="ghost" size="xs" className="h-auto px-2 py-0.5 text-[10px]">
            保存
          </Button>
        </div>
        <Select>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="选择预设..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="default">默认</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <span className="text-muted-foreground">导出路径</span>
        <div className="flex items-center gap-1.5">
          <Input
            value={outputPath}
            readOnly
            className="h-7 flex-1 cursor-default px-1.5 text-[10px] text-muted-foreground"
          />
          <Button variant="outline" size="icon-xs" className="shrink-0" title="打开文件夹">
            <FolderOpen className="size-2.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <Button className="w-full text-xs" size="sm">
          导出当前
        </Button>
        <Button variant="outline" className="w-full text-xs" size="sm">
          批量导出全部
        </Button>
      </div>
    </div>
  );
}
