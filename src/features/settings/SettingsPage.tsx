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
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { type AppConfig, getConfig, openDirectory, updateConfig } from '@/api';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWindowStyle } from '@/components/window-style-context';
import { clearAssetCaches } from '@/infra/assets';
import { type CacheOverview, cleanupCache, clearCache, getCacheOverview } from '@/infra/fs';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'general', label: '通用', icon: Cog },
  { id: 'template', label: '边框水印', icon: Box },
  { id: 'collage', label: '拼图', icon: Palette },
  { id: 'export', label: '导出', icon: Download },
  { id: 'cache', label: '缓存', icon: Database },
  { id: 'about', label: '关于', icon: Info },
] as const;

function defaultCacheDirectory(saveDirectory: string): string {
  const separator = saveDirectory.includes('\\') ? '\\' : '/';
  const normalized = saveDirectory.replace(/[\\/]+$/, '');
  return `${normalized}${separator}cache`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[index]}`;
}

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

function StorageSummary({ overview }: { overview: CacheOverview | null }) {
  const total = overview?.total_bytes ?? 0;
  const segments = [
    {
      key: 'images',
      label: '图片副本',
      count: overview?.image_count ?? 0,
      bytes: overview?.image_bytes ?? 0,
      color: 'bg-sky-400',
      tint: 'bg-sky-50',
      ring: 'ring-sky-200',
    },
    {
      key: 'previews',
      label: '预览缓存',
      count: overview?.preview_count ?? 0,
      bytes: overview?.preview_bytes ?? 0,
      color: 'bg-emerald-400',
      tint: 'bg-emerald-50',
      ring: 'ring-emerald-200',
    },
    {
      key: 'thumbnails',
      label: '缩略图缓存',
      count: overview?.thumbnail_count ?? 0,
      bytes: overview?.thumbnail_bytes ?? 0,
      color: 'bg-amber-400',
      tint: 'bg-amber-50',
      ring: 'ring-amber-200',
    },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
      <div className="overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/70">
        <div className="flex h-4 w-full">
          {segments.map((segment) => {
            const width =
              total > 0 ? Math.max((segment.bytes / total) * 100, segment.bytes > 0 ? 6 : 0) : 0;
            return (
              <div
                key={segment.key}
                className={cn('h-full transition-[width] duration-300', segment.color)}
                style={{ width: `${width}%` }}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={cn(
              'rounded-2xl px-4 py-3 ring-1 shadow-sm transition-colors xl:px-4 xl:py-3',
              'sm:px-3.5 sm:py-2.5 xl:sm:px-4 xl:sm:py-3',
              segment.tint,
              segment.ring,
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn('size-2.5 rounded-full', segment.color)} />
              <p className="text-xs font-semibold tracking-[0.14em] text-foreground/80 uppercase">
                {segment.label}
              </p>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3 xl:mt-3 xl:block">
              <p className="text-lg font-semibold text-foreground sm:text-xl xl:text-2xl">
                {formatBytes(segment.bytes)}
              </p>
              <p className="text-[11px] text-muted-foreground sm:text-xs xl:mt-1">
                {segment.count} 个文件
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>总占用</span>
        <span className="font-medium text-foreground">{formatBytes(total)}</span>
      </div>
    </div>
  );
}

function PlaceholderTab({
  title,
  description,
  cards,
}: {
  title: string;
  description: string;
  cards: Array<{ title: string; description: string; active?: boolean }>;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup title={title} description={description}>
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((card) => (
            <OptionCard key={card.title} title={card.title} active={card.active}>
              {card.description}
            </OptionCard>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}

function GeneralTab({
  config,
  onSelectSaveDirectory,
}: {
  config: AppConfig;
  onSelectSaveDirectory: () => Promise<void>;
}) {
  const { frameMode, frameModePending, setFrameMode } = useWindowStyle();

  return (
    <div className="space-y-4">
      <FieldGroup title="通用" description="控制应用的全局行为与默认保存位置。">
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
                ? '正在切换窗口样式...'
                : '系统边框模式将使用操作系统自带窗口外框。'}
            </p>
          </div>
        </SettingField>

        <SettingField label="语言" description="当前界面语言来自持久化配置。">
          <Select value={config.language} disabled>
            <SelectTrigger className="w-full max-w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="zh-CN">简体中文</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingField>

        <SettingField
          label="默认保存目录"
          description="缓存目录默认位于该目录下的 cache 文件夹。修改后如果缓存目录仍是默认值，会一起跟随更新。"
        >
          <div className="flex max-w-3xl items-center gap-2">
            <Input value={config.save_directory} readOnly />
            <Button variant="outline" onClick={() => void onSelectSaveDirectory()}>
              <FolderOpen data-icon="inline-start" />
              选择
            </Button>
          </div>
        </SettingField>

        <SettingField label="默认导出目录" description="导出默认使用当前保存目录。">
          <Input value={config.output.default_path} readOnly className="max-w-3xl" />
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function CacheTab({
  config,
  overview,
  loading,
  onSelectCacheDirectory,
  onOpenCacheDirectory,
  onToggleAutoCleanup,
  onChangeMaxAgeDays,
  onCleanupExpired,
  onClearThumbnails,
  onClearAll,
}: {
  config: AppConfig;
  overview: CacheOverview | null;
  loading: boolean;
  onSelectCacheDirectory: () => Promise<void>;
  onOpenCacheDirectory: () => Promise<void>;
  onToggleAutoCleanup: (checked: boolean) => Promise<void>;
  onChangeMaxAgeDays: (days: number) => Promise<void>;
  onCleanupExpired: () => Promise<void>;
  onClearThumbnails: () => Promise<void>;
  onClearAll: () => Promise<void>;
}) {
  const [draftMaxAgeDays, setDraftMaxAgeDays] = useState(config.cache.max_age_days);

  useEffect(() => {
    setDraftMaxAgeDays(config.cache.max_age_days);
  }, [config.cache.max_age_days]);

  return (
    <div className="space-y-4">
      <FieldGroup title="缓存" description="管理导入图片副本、缩略图与自动清理策略。">
        <SettingField
          label="缓存目录"
          description="导入后的图片副本、预览文件与缩略图都会保存在这里。"
        >
          <div className="flex max-w-3xl items-center gap-2">
            <Input value={config.cache.directory} readOnly />
            <Button variant="outline" onClick={() => void onOpenCacheDirectory()}>
              <FolderOpen data-icon="inline-start" />
              打开
            </Button>
            <Button variant="outline" onClick={() => void onSelectCacheDirectory()}>
              <FolderOpen data-icon="inline-start" />
              选择
            </Button>
          </div>
        </SettingField>

        <SettingField
          label="缓存摘要"
          description="从当前缓存目录实时扫描图片副本、预览副本和缩略图占用。"
        >
          <StorageSummary overview={overview} />
        </SettingField>

        <SettingField label="自动清理" description="应用启动时自动清理超过保留天数的缓存文件。">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={config.cache.auto_cleanup_on_startup}
                onCheckedChange={(checked) => void onToggleAutoCleanup(checked)}
              />
              <span className="text-sm">
                {config.cache.auto_cleanup_on_startup ? '已开启自动清理' : '已关闭自动清理'}
              </span>
            </div>
            <div className="max-w-md">
              <Slider
                key={config.cache.max_age_days}
                defaultValue={[config.cache.max_age_days]}
                onValueChange={([days]) => setDraftMaxAgeDays(days)}
                onValueCommit={([days]) => void onChangeMaxAgeDays(days)}
                min={1}
                max={90}
                step={1}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                当前保留时长 {draftMaxAgeDays} 天
              </p>
            </div>
          </div>
        </SettingField>

        <SettingField label="清理缓存" description="可单独清理缩略图，或清理过期/全部缓存。">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={loading} onClick={() => void onCleanupExpired()}>
              <RefreshCw data-icon="inline-start" className={cn(loading && 'animate-spin')} />
              清理过期缓存
            </Button>
            <Button variant="outline" disabled={loading} onClick={() => void onClearThumbnails()}>
              <Trash2 data-icon="inline-start" />
              清理缩略图
            </Button>
            <Button variant="outline" disabled={loading} onClick={() => void onClearAll()}>
              <Trash2 data-icon="inline-start" />
              清理全部缓存
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
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [overview, setOverview] = useState<CacheOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheActionPending, setCacheActionPending] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const nextConfig = await getConfig();
      setConfig(nextConfig);
      const nextOverview = await getCacheOverview(nextConfig.cache.directory);
      setOverview(nextOverview);
    } catch (error) {
      console.error('Load settings failed:', error);
      toast.error('读取设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(async (nextConfig: AppConfig) => {
    setConfig(nextConfig);
    await updateConfig(nextConfig);
    const nextOverview = await getCacheOverview(nextConfig.cache.directory);
    setOverview(nextOverview);
  }, []);

  const withCacheAction = useCallback(async (runner: () => Promise<void>) => {
    setCacheActionPending(true);
    try {
      await runner();
    } catch (error) {
      console.error('Cache settings action failed:', error);
      toast.error('缓存设置操作失败');
    } finally {
      setCacheActionPending(false);
    }
  }, []);

  const handleSelectSaveDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) {
      return;
    }

    const followsDefaultCache =
      config.cache.directory === defaultCacheDirectory(config.save_directory);
    const nextConfig: AppConfig = {
      ...config,
      save_directory: selected,
      output: {
        ...config.output,
        default_path: selected,
      },
      cache: followsDefaultCache
        ? {
            ...config.cache,
            directory: defaultCacheDirectory(selected),
          }
        : config.cache,
    };

    await withCacheAction(async () => {
      await saveConfig(nextConfig);
      toast.success('默认保存目录已更新');
    });
  }, [config, saveConfig, withCacheAction]);

  const handleSelectCacheDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) {
      return;
    }

    await withCacheAction(async () => {
      await saveConfig({
        ...config,
        cache: {
          ...config.cache,
          directory: selected,
        },
      });
      clearAssetCaches();
      toast.success('缓存目录已更新');
    });
  }, [config, saveConfig, withCacheAction]);

  const handleOpenCacheDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    try {
      await openDirectory(config.cache.directory);
    } catch (error) {
      console.error('Open cache directory failed:', error);
      toast.error('打开缓存目录失败');
    }
  }, [config]);

  const handleToggleAutoCleanup = useCallback(
    async (checked: boolean) => {
      if (!config) {
        return;
      }

      await withCacheAction(async () => {
        await saveConfig({
          ...config,
          cache: {
            ...config.cache,
            auto_cleanup_on_startup: checked,
          },
        });
      });
    },
    [config, saveConfig, withCacheAction],
  );

  const handleChangeMaxAgeDays = useCallback(
    async (days: number) => {
      if (!config || days === config.cache.max_age_days) {
        return;
      }

      await withCacheAction(async () => {
        await saveConfig({
          ...config,
          cache: {
            ...config.cache,
            max_age_days: days,
          },
        });
      });
    },
    [config, saveConfig, withCacheAction],
  );

  const handleCleanupExpired = useCallback(async () => {
    if (!config) {
      return;
    }

    await withCacheAction(async () => {
      const result = await cleanupCache(config.cache.directory, config.cache.max_age_days);
      const nextOverview = await getCacheOverview(config.cache.directory);
      setOverview(nextOverview);
      clearAssetCaches();
      toast.success(`已清理 ${result.removed_files} 个过期缓存文件`);
    });
  }, [config, withCacheAction]);

  const handleClearThumbnails = useCallback(async () => {
    if (!config) {
      return;
    }

    await withCacheAction(async () => {
      const nextOverview = await clearCache(config.cache.directory, 'thumbnails');
      setOverview(nextOverview);
      clearAssetCaches();
      toast.success('缩略图缓存已清理');
    });
  }, [config, withCacheAction]);

  const handleClearAll = useCallback(async () => {
    if (!config) {
      return;
    }

    await withCacheAction(async () => {
      const nextOverview = await clearCache(config.cache.directory, 'all');
      setOverview(nextOverview);
      clearAssetCaches();
      toast.success('全部缓存已清理');
    });
  }, [config, withCacheAction]);

  if (loading || !config) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <CoWindowHeader icon={Settings2} title="设置" description="正在读取配置与缓存状态。" />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          正在加载设置...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <CoWindowHeader
        icon={Settings2}
        title="设置"
        description="管理软件行为、缓存目录、缩略图生成与自动清理策略。"
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
              <GeneralTab config={config} onSelectSaveDirectory={handleSelectSaveDirectory} />
            </TabsContent>
            <TabsContent value="template" className="mt-0">
              <PlaceholderTab
                title="边框水印"
                description="模板默认项仍保持占位状态，本次优先落地素材缓存链路。"
                cards={[
                  { title: '默认模板', description: '后续与模板系统联动。' },
                  { title: '默认字体', description: '后续与字体收藏和模板 schema 联动。' },
                ]}
              />
            </TabsContent>
            <TabsContent value="collage" className="mt-0">
              <PlaceholderTab
                title="拼图"
                description="拼图默认项仍保持占位状态，本次优先落地素材缓存链路。"
                cards={[
                  { title: '默认布局', description: '后续与拼图布局预设联动。' },
                  { title: '默认画布样式', description: '后续与拼图渲染设置联动。' },
                ]}
              />
            </TabsContent>
            <TabsContent value="export" className="mt-0">
              <PlaceholderTab
                title="导出"
                description="导出默认项仍保持占位状态，本次优先落地素材缓存链路。"
                cards={[
                  { title: '默认导出格式', description: '后续与导出管线默认值联动。' },
                  { title: '默认倍率与质量', description: '后续与导出面板联动。' },
                ]}
              />
            </TabsContent>
            <TabsContent value="cache" className="mt-0">
              <CacheTab
                config={config}
                overview={overview}
                loading={cacheActionPending}
                onSelectCacheDirectory={handleSelectCacheDirectory}
                onOpenCacheDirectory={handleOpenCacheDirectory}
                onToggleAutoCleanup={handleToggleAutoCleanup}
                onChangeMaxAgeDays={handleChangeMaxAgeDays}
                onCleanupExpired={handleCleanupExpired}
                onClearThumbnails={handleClearThumbnails}
                onClearAll={handleClearAll}
              />
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
