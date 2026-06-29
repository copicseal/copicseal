import { open } from '@tauri-apps/plugin-dialog';
import { check } from '@tauri-apps/plugin-updater';
import {
  Box,
  Check,
  Cog,
  Database,
  Download,
  FolderOpen,
  Info,
  Palette,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { CoWindowHeader } from '@/components/CoWindowHeader';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWindowStyle } from '@/components/window-style-context';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'general', label: '通用', icon: Cog },
  { id: 'template', label: '边框水印', icon: Box },
  { id: 'collage', label: '拼图', icon: Palette },
  { id: 'export', label: '导出', icon: Download },
  { id: 'cache', label: '缓存', icon: Database },
  { id: 'about', label: '关于', icon: Info },
] as const;

function FieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border/80 bg-card px-5 py-5 shadow-sm">
      <div className="max-w-2xl">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SettingField({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 border-t border-border/70 py-4 first:border-t-0 first:pt-0 md:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function OptionCard({
  title,
  active = false,
  children,
}: {
  title: string;
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'border px-4 py-3 transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-border bg-background',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        {active ? <Check className="size-4 text-primary" /> : null}
      </div>
      {children ? <div className="mt-1 text-xs text-muted-foreground">{children}</div> : null}
    </div>
  );
}

function GeneralTab() {
  const [exportDirectory, setExportDirectory] = useState('~/Documents/Copicseal');
  const { frameMode, frameModePending, setFrameMode } = useWindowStyle();

  const handlePickDirectory = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && !Array.isArray(selected)) {
      setExportDirectory(selected);
    }
  };

  return (
    <div className="space-y-4">
      <FieldGroup title="通用" description="控制应用的全局行为与启动体验。">
        <SettingField label="主题" description="切换浅色、深色或跟随系统。">
          <RadioGroup
            defaultValue="system"
            className="flex flex-wrap gap-3"
            orientation="horizontal"
          >
            {[
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
              { value: 'system', label: '跟随系统' },
            ].map(({ value, label }) => (
              <label key={value} htmlFor={`theme-${value}`} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`theme-${value}`} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </RadioGroup>
        </SettingField>

        <SettingField
          label="窗口边框"
          description="切换使用系统边框或无边框窗口，修改后会立即生效。"
        >
          <div className="space-y-2">
            <RadioGroup
              value={frameMode}
              className="flex flex-wrap gap-3"
              orientation="horizontal"
              onValueChange={(value) =>
                void setFrameMode(value === 'native' ? 'native' : 'frameless')
              }
            >
              {[
                { value: 'native', label: '系统边框' },
                { value: 'frameless', label: '无边框' },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  htmlFor={`window-frame-${value}`}
                  className="flex items-center gap-2"
                >
                  <RadioGroupItem
                    value={value}
                    id={`window-frame-${value}`}
                    disabled={frameModePending}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </RadioGroup>
            <p className="text-xs leading-5 text-muted-foreground">
              {frameModePending
                ? '正在切换窗口边框样式...'
                : '系统边框模式将使用操作系统自带窗口外框。'}
            </p>
          </div>
        </SettingField>

        <SettingField label="语言" description="配置应用的界面语言。">
          <Select defaultValue="zh-CN">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en">英语</SelectItem>
                <SelectItem value="ja">日语</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingField>

        <SettingField label="启动页" description="设置应用启动后默认进入的一级页面。">
          <Select defaultValue="template">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="template">边框水印</SelectItem>
                <SelectItem value="collage">拼图</SelectItem>
                <SelectItem value="settings">设置</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingField>

        <SettingField label="默认导出目录" description="指定导出图片时的默认保存位置。">
          <div className="flex max-w-2xl items-center gap-2">
            <Input value={exportDirectory} readOnly />
            <Button variant="outline" onClick={() => void handlePickDirectory()}>
              <FolderOpen data-icon="inline-start" />
              选择
            </Button>
          </div>
        </SettingField>

        <SettingField label="自动更新" description="决定是否在应用中主动检查更新。">
          <RadioGroup
            defaultValue="enabled"
            className="flex flex-wrap gap-3"
            orientation="horizontal"
          >
            {[
              { value: 'enabled', label: '开启' },
              { value: 'disabled', label: '关闭' },
            ].map(({ value, label }) => (
              <label
                key={value}
                htmlFor={`autoupdate-${value}`}
                className="flex items-center gap-2"
              >
                <RadioGroupItem value={value} id={`autoupdate-${value}`} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </RadioGroup>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function TemplateTab() {
  const [borderWidth, setBorderWidth] = useState([24]);
  const [fontScale, setFontScale] = useState([1]);

  return (
    <div className="space-y-4">
      <FieldGroup title="边框水印" description="配置边框水印页面的默认模板与样式参数。">
        <SettingField label="默认模板" description="设置进入边框水印页面时默认选中的模板。">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { name: 'Leica', description: '经典相机信息排版' },
              { name: 'Film', description: '胶片边框与颗粒风格' },
              { name: '极简', description: '最简边框水印方案' },
              { name: '社媒', description: '社交媒体风格展示卡片' },
            ].map((item, index) => (
              <OptionCard key={item.name} title={item.name} active={index === 2}>
                {item.description}
              </OptionCard>
            ))}
          </div>
        </SettingField>

        <SettingField label="默认字体" description="控制模板文字信息的默认字体。">
          <Select defaultValue="inter">
            <SelectTrigger className="w-full max-w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="inter">Inter 可变字体</SelectItem>
                <SelectItem value="ibm-plex">IBM Plex Sans</SelectItem>
                <SelectItem value="georgia">Georgia</SelectItem>
                <SelectItem value="sf-pro">SF Pro</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingField>

        <SettingField label="默认边框宽度" description="控制模板边框的基础宽度。">
          <div className="max-w-md">
            <Slider value={borderWidth} onValueChange={setBorderWidth} min={0} max={80} step={1} />
            <p className="mt-2 text-xs text-muted-foreground">{borderWidth[0]} px</p>
          </div>
        </SettingField>

        <SettingField label="默认背景颜色" description="设置模板默认背景色。">
          <div className="flex max-w-md items-center gap-2">
            <input
              type="color"
              defaultValue="#ffffff"
              className="h-10 w-12 border border-border bg-background p-1"
            />
            <Input defaultValue="#ffffff" />
          </div>
        </SettingField>

        <SettingField label="默认 EXIF 格式" description="控制相机参数文本的默认模板。">
          <div className="grid gap-3">
            <Input defaultValue="{Make} {Model}" />
            <Input defaultValue="{FocalLength}  f/{FNumber}  {ExposureTime}s  ISO{ISO}" />
            <div className="max-w-md">
              <Slider value={fontScale} onValueChange={setFontScale} min={0.6} max={2} step={0.1} />
              <p className="mt-2 text-xs text-muted-foreground">
                字体倍率 {fontScale[0].toFixed(1)}x
              </p>
            </div>
          </div>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function CollageTab() {
  const [gap, setGap] = useState([12]);
  const [radius, setRadius] = useState([18]);

  return (
    <div className="space-y-4">
      <FieldGroup title="拼图" description="配置拼图页面的默认布局与样式。">
        <SettingField label="默认布局" description="设置进入拼图页面时使用的默认布局模式。">
          <Select defaultValue="four-grid">
            <SelectTrigger className="w-full max-w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="two-columns">2 宫格</SelectItem>
                <SelectItem value="three-columns">3 宫格</SelectItem>
                <SelectItem value="four-grid">4 宫格</SelectItem>
                <SelectItem value="six-grid">6 宫格</SelectItem>
                <SelectItem value="free-layout">自由布局</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingField>

        <SettingField label="默认间距" description="控制拼图项之间的默认间距。">
          <div className="max-w-md">
            <Slider value={gap} onValueChange={setGap} min={0} max={48} step={1} />
            <p className="mt-2 text-xs text-muted-foreground">{gap[0]} px</p>
          </div>
        </SettingField>

        <SettingField label="默认背景色" description="设置拼图画布的默认背景色。">
          <div className="flex max-w-md items-center gap-2">
            <input
              type="color"
              defaultValue="#ffffff"
              className="h-10 w-12 border border-border bg-background p-1"
            />
            <Input defaultValue="#ffffff" />
          </div>
        </SettingField>

        <SettingField label="默认圆角" description="控制拼图项的默认圆角。">
          <div className="max-w-md">
            <Slider value={radius} onValueChange={setRadius} min={0} max={48} step={1} />
            <p className="mt-2 text-xs text-muted-foreground">{radius[0]} px</p>
          </div>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function ExportTab() {
  const [scale, setScale] = useState([1]);
  const [quality, setQuality] = useState([90]);

  return (
    <div className="space-y-4">
      <FieldGroup title="导出" description="设置共享导出管线的默认格式、倍率与质量。">
        <SettingField label="默认格式" description="控制导出的默认文件格式。">
          <div className="grid gap-3 md:grid-cols-3">
            {['PNG', 'JPG', 'WEBP'].map((item, index) => (
              <OptionCard key={item} title={item} active={index === 0} />
            ))}
          </div>
        </SettingField>

        <SettingField label="默认倍率" description="控制默认导出的缩放倍率。">
          <div className="max-w-md">
            <Slider value={scale} onValueChange={setScale} min={0.5} max={3} step={0.1} />
            <p className="mt-2 text-xs text-muted-foreground">{scale[0].toFixed(1)}x</p>
          </div>
        </SettingField>

        <SettingField label="默认质量" description="控制 JPG / WEBP 导出的质量。">
          <div className="max-w-md">
            <Slider value={quality} onValueChange={setQuality} min={1} max={100} step={1} />
            <p className="mt-2 text-xs text-muted-foreground">{quality[0]}</p>
          </div>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function CacheTab() {
  return (
    <div className="space-y-4">
      <FieldGroup title="缓存" description="管理缩略图缓存、预览资源缓存与清理策略。">
        <SettingField label="缓存摘要" description="查看当前缓存状态与预计占用。">
          <div className="grid gap-3 md:grid-cols-2">
            <OptionCard title="缩略图缓存">约 128 MB，用于素材栏缩略图加载。</OptionCard>
            <OptionCard title="预览资源缓存">约 256 MB，用于模板与拼图预览。</OptionCard>
          </div>
        </SettingField>

        <SettingField label="清理缓存" description="清理本地缓存并释放磁盘空间。">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">
              <Trash2 data-icon="inline-start" />
              清理缩略图缓存
            </Button>
            <Button variant="outline">
              <Trash2 data-icon="inline-start" />
              清理预览资源缓存
            </Button>
          </div>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function AboutTab() {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleCheckUpdate = async () => {
    setChecking(true);
    setStatus(null);

    try {
      const update = await check();
      setStatus(update ? `发现新版本 ${update.version}` : '已是最新版本');
    } catch {
      setStatus('检查更新失败');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <FieldGroup title="关于" description="查看产品信息、技术栈与版本更新状态。">
        <SettingField label="产品信息" description="当前产品定位与技术实现摘要。">
          <div className="grid gap-3 md:grid-cols-2">
            <OptionCard title="可图匠（Copicseal）">以图片处理为核心的桌面应用。</OptionCard>
            <OptionCard title="技术栈">Tauri 2 + React 19 + Rust</OptionCard>
          </div>
        </SettingField>

        <SettingField label="检查更新" description="手动检查应用新版本。">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void handleCheckUpdate()} variant="outline">
              <RefreshCw className={cn('size-3.5', checking && 'animate-spin')} />
              {checking ? '检查中...' : '检查更新'}
            </Button>
            {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
          </div>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <CoWindowHeader
        icon={Settings2}
        title="设置"
        description="管理软件行为、边框水印默认配置、拼图默认配置与导出策略。"
      />

      <Tabs defaultValue="general" orientation="vertical" className="min-h-0 flex-1 p-4">
        <TabsList variant="line" className="w-56 shrink-0 border border-border/80 bg-card p-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id}>
                <Icon className="size-3.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto pl-4">
          <div className="mx-auto w-full max-w-5xl">
            <TabsContent value="general" className="mt-0">
              <GeneralTab />
            </TabsContent>
            <TabsContent value="template" className="mt-0">
              <TemplateTab />
            </TabsContent>
            <TabsContent value="collage" className="mt-0">
              <CollageTab />
            </TabsContent>
            <TabsContent value="export" className="mt-0">
              <ExportTab />
            </TabsContent>
            <TabsContent value="cache" className="mt-0">
              <CacheTab />
            </TabsContent>
            <TabsContent value="about" className="mt-0">
              <AboutTab />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
