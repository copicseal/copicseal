import {
  Box,
  Cog,
  Database,
  Download,
  Info,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'general', label: 'General', icon: Cog },
  { id: 'template', label: 'Template', icon: Box },
  { id: 'collage', label: 'Collage', icon: Box },
  { id: 'export', label: 'Export', icon: Download },
  { id: 'cache', label: 'Cache', icon: Database },
  { id: 'about', label: 'About', icon: Info },
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
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="max-w-xl">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function GeneralTab() {
  return (
    <div className="space-y-4">
      <FieldGroup title="Theme" description="控制应用主题外观。">
        <RadioGroup defaultValue="system" className="flex gap-4" orientation="horizontal">
          {[
            { value: 'light', label: '浅色' },
            { value: 'dark', label: '深色' },
            { value: 'system', label: '跟随系统' },
          ].map(({ value, label }) => (
            <label key={value} htmlFor={`theme-${value}`} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`theme-${value}`} />
              <span>{label}</span>
            </label>
          ))}
        </RadioGroup>
      </FieldGroup>

      <FieldGroup title="Language" description="设置界面语言与文案方向。">
        <Select defaultValue="zh-CN">
          <SelectTrigger className="h-9 w-[220px] rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="zh-CN">简体中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </FieldGroup>

      <FieldGroup title="Startup Page" description="决定应用启动时默认进入的页面。">
        <Select defaultValue="template">
          <SelectTrigger className="h-9 w-[220px] rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="template">Template</SelectItem>
            <SelectItem value="collage">Collage</SelectItem>
            <SelectItem value="settings">Settings</SelectItem>
          </SelectContent>
        </Select>
      </FieldGroup>

      <FieldGroup title="Default Export Directory" description="配置默认导出目录与行为。">
        <div className="flex max-w-xl items-center gap-2">
          <Input defaultValue="~/Documents/Copicseal" readOnly className="h-10 rounded-full" />
          <Button variant="outline" className="rounded-full px-4">
            选择
          </Button>
        </div>
      </FieldGroup>
    </div>
  );
}

function TemplateTab() {
  return (
    <div className="space-y-4">
      <FieldGroup title="默认模板" description="为 Template 页面提供默认视觉起点。">
        <div className="grid gap-3 md:grid-cols-2">
          {['Leica', 'Film', 'Minimal', 'Instagram'].map((name) => (
            <div key={name} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">{name}</p>
              <p className="mt-1 text-xs text-muted-foreground">支持搜索、收藏、最近使用</p>
            </div>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup title="默认样式" description="包含默认字体、边框宽度、背景颜色与 EXIF 格式。">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            '默认字体',
            '默认边框宽度',
            '默认背景颜色',
            '默认 EXIF 格式',
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              {item}
            </div>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}

function CollageTab() {
  return (
    <div className="space-y-4">
      <FieldGroup title="默认布局" description="配置拼图页面的默认布局模式与基础样式。">
        <div className="grid gap-3 md:grid-cols-2">
          {['默认布局', '默认间距', '默认背景色', '默认圆角'].map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              {item}
            </div>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}

function ExportTab() {
  return (
    <div className="space-y-4">
      <FieldGroup title="导出默认值" description="配置共享导出管线的默认格式、倍率与质量。">
        <div className="grid gap-3 md:grid-cols-3">
          {['PNG', 'JPG', 'WEBP'].map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {['默认倍率', '默认质量'].map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              {item}
            </div>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}

function CacheTab() {
  return (
    <div className="space-y-4">
      <FieldGroup title="缓存管理" description="后续这里会管理缩略图缓存、预览资源缓存与清理策略。">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
          <div>
            <p className="text-sm font-medium">预览缓存</p>
            <p className="text-xs text-muted-foreground">当前为页面骨架占位。</p>
          </div>
          <Button variant="outline" className="rounded-full px-4">
            <Trash2 data-icon="inline-start" />
            清理
          </Button>
        </div>
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
      <FieldGroup title="About Copicseal" description="当前阶段为新版页面骨架与信息架构搭建。">
        <div className="flex items-start justify-between gap-4 rounded-3xl border border-border bg-background p-5">
          <div>
            <p className="text-base font-semibold">Copicseal</p>
            <p className="mt-1 text-xs text-muted-foreground">Tauri 2 + React 19 + Rust</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Settings2 className="size-5" />
          </div>
        </div>
        <Button onClick={handleCheckUpdate} variant="outline" className="rounded-full px-4">
          <RefreshCw className={cn('size-3.5', checking && 'animate-spin')} />
          {checking ? '检查中...' : '检查更新'}
        </Button>
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </FieldGroup>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,color-mix(in_oklch,var(--color-muted),white_25%)_0%,var(--color-background)_100%)]">
      <div className="border-b border-border/80 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
            <Settings2 className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              管理软件行为、Template 默认配置、Collage 默认配置与导出策略。
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" orientation="vertical" className="min-h-0 flex-1 p-4">
        <TabsList
          variant="line"
          className="w-56 shrink-0 rounded-[28px] border border-border/80 bg-card p-3"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2 rounded-2xl px-3 py-2.5">
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
