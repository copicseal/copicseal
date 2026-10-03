import {
  Box,
  Check,
  Cog,
  Database,
  Download,
  Info,
  LayoutTemplate,
  type LucideIcon,
  Palette,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { parseDefaultPresets } from '@/features/template/lib/export-preset';
import { useTemplateStore } from '@/features/template/store/use-template-store';
import {
  type AppConfig,
  type AppUpdateInfo,
  type CacheOverview,
  clearAssetCaches,
  getInUseAssetPaths,
  type OutputPreset,
  platformCapabilities,
} from '@/platform';
import { platformRuntime } from '@/platform/providers/platform-runtime';

const {
  checkForUpdate,
  cleanupCache,
  clearCache,
  getCacheOverview,
  getConfig,
  installUpdate,
  openDirectory,
  openDirectoryDialog,
  updateConfig,
} = platformRuntime;

import { CoDirectoryField } from '@/shared/components/co-directory-field';
import { CoWindowHeader } from '@/shared/components/co-window-header';
import { cn } from '@/shared/lib/utils';
import { useAppNavigation } from '@/shared/providers/navigation-provider';
import { usePageActive } from '@/shared/providers/page-activity-provider';
import { useWindowStyle } from '@/shared/providers/window-style-provider';
import { Button } from '@/shared/ui/button';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { ScrollArea } from '@/shared/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Slider } from '@/shared/ui/slider';
import { Switch } from '@/shared/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

interface SettingsTab {
  id: string;
  label: string;
  /** 只有一级 tab 带图标；二级 tab 靠缩进表达层级，不再重复图标 */
  icon?: LucideIcon;
}

interface SettingsTabGroup {
  /** 有 label 就是分组：标题不可点，内容放在子项里 */
  label?: string;
  icon?: LucideIcon;
  items: SettingsTab[];
}

/**
 * 侧边 tab 的两级结构。
 *
 * 只对某个功能生效的设置挂在功能下面（如「边框水印 → 导出」），不和全局设置混在
 * 一起；纯分组标题不可点，避免出现"父级有内容、子级也有内容"的双份入口。
 */
const TAB_GROUPS: SettingsTabGroup[] = [
  { items: [{ id: 'general', label: '通用', icon: Cog }] },
  {
    label: '边框水印',
    icon: Box,
    items: [
      { id: 'template', label: '默认项' },
      { id: 'template-export', label: '导出' },
    ],
  },
  {
    label: '拼图',
    icon: Palette,
    items: [
      { id: 'collage', label: '默认项' },
      { id: 'collage-export', label: '导出' },
    ],
  },
  { items: [{ id: 'export', label: '导出', icon: Download }] },
  { items: [{ id: 'cache', label: '缓存', icon: Database }] },
  { items: [{ id: 'about', label: '关于', icon: Info }] },
];

/** 工作区目录下的默认缓存目录；缓存没被单独改过时会跟着工作区目录走。 */
function defaultCacheDirectory(saveDirectory: string): string {
  const separator = saveDirectory.includes('\\') ? '\\' : '/';
  const normalized = saveDirectory.replace(/[\\/]+$/, '');
  return `${normalized}${separator}Cache`;
}

/**
 * 跳转锚点 id → 它所在的设置 tab。
 *
 * 地址栏 hash 只带元素 id，落到别的 tab 里时需要先把 tab 切过去，
 * 否则元素虽然存在（Radix Tabs 未激活时不渲染）却定位不到。
 */
const ANCHOR_TABS: Record<string, string> = {
  'export-directory': 'export',
};

/** 清理缓存时被保留下来的在用量提示；没有在使用的素材时不追加。 */
function keepNote(count: number): string {
  return count > 0 ? `（保留 ${count} 张正在使用的图片）` : '';
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
  id,
  label,
  description,
  children,
}: {
  /** 锚点 id：从别处（例如导出完成提示里的「更改」）跳进来时用来定位 */
  id?: string;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="grid gap-3 border-t border-border/70 py-4 first:border-t-0 first:pt-0 md:grid-cols-[220px_minmax(0,1fr)]"
    >
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

/** 默认档位一行的摘要：尺寸 + 倍率（JPEG 才带质量）。 */
function describeOutputPreset(preset: OutputPreset): string {
  const parts = [`${preset.width} × ${preset.height}`, `倍率 ${preset.scale.toFixed(1)}x`];
  if (preset.type === 'jpeg') {
    parts.push(`质量 ${Math.round(preset.quality)}`);
  }

  return parts.join(' · ');
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
  onSelectWorkspaceDirectory,
  onOpenWorkspaceDirectory,
}: {
  config: AppConfig;
  onSelectWorkspaceDirectory: () => Promise<void>;
  onOpenWorkspaceDirectory: () => Promise<void>;
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
          label="工作区目录"
          description="应用自己的数据目录，缓存目录默认位于它下面的 Cache 文件夹。修改后如果缓存目录仍是默认值，会一起跟随更新。"
        >
          <CoDirectoryField
            directory={config.save_directory}
            onOpen={() => void onOpenWorkspaceDirectory()}
            onSelect={() => void onSelectWorkspaceDirectory()}
          />
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function TemplateExportDefaultsTab({
  presets,
  onRemovePreset,
  onGoToTemplate,
}: {
  presets: OutputPreset[];
  onRemovePreset: (index: number) => void;
  onGoToTemplate: () => void;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup
        title="边框水印导出"
        description="只对边框水印生效。在模板页导出面板点「存为默认档位」写入，新导入的图片自动套用。"
      >
        <SettingField
          id="template-export-presets"
          label="默认档位"
          description="每档一组格式、尺寸、倍率与质量，导出时逐档输出一份文件。"
        >
          {presets.length === 0 ? (
            <p className="text-xs leading-5 text-muted-foreground">
              还没有默认档位，新图片会从 2000 × 2000 的 PNG 开始。
            </p>
          ) : (
            <ul className="space-y-2">
              {presets.map((preset, index) => {
                const presetLabel = `${preset.type.toUpperCase()} ${describeOutputPreset(preset)}`;

                return (
                  <li
                    key={preset.id ?? `${preset.type}-${preset.width}x${preset.height}`}
                    className="flex items-center gap-3 border border-border/70 bg-background/60 px-3 py-1.5"
                  >
                    <span className="shrink-0 border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                      {preset.type.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                      {describeOutputPreset(preset)}
                    </span>
                    <Button
                      type="button"
                      variant="plain"
                      size="icon-sm"
                      aria-label={`删除 ${presetLabel}`}
                      onClick={() => onRemovePreset(index)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3">
            <Button type="button" variant="outline" size="sm" onClick={onGoToTemplate}>
              <LayoutTemplate data-icon="inline-start" />
              去模板页设置档位
            </Button>
          </div>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function ExportTab({
  config,
  onSelectExportDirectory,
  onOpenExportDirectory,
}: {
  config: AppConfig;
  onSelectExportDirectory: () => Promise<void>;
  onOpenExportDirectory: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup
        title="导出"
        description="边框水印与拼图共用这个目录，导出过程不会再弹保存对话框。"
      >
        <SettingField
          id="export-directory"
          label="文件导出目录"
          description="导出的图片直接写到这个目录，文件名由导出面板里的档位决定。"
        >
          <CoDirectoryField
            directory={config.output.default_path}
            onOpen={() => void onOpenExportDirectory()}
            onSelect={() => void onSelectExportDirectory()}
          />
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
          <CoDirectoryField
            directory={config.cache.directory}
            onOpen={() => void onOpenCacheDirectory()}
            onSelect={() => void onSelectCacheDirectory()}
          />
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

        <SettingField
          label="清理缓存"
          description="可单独清理缩略图，或清理过期/全部缓存；正在使用的图片副本会保留。"
        >
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
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);

  const handleCheckUpdate = async () => {
    setChecking(true);
    setStatus(null);
    setUpdate(null);

    try {
      const info = await checkForUpdate();
      setUpdate(info);
      setStatus(info ? `发现新版本 ${info.version}` : '已是最新版本');
    } catch {
      setStatus('检查更新失败');
    } finally {
      setChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    setInstalling(true);
    setProgress(null);

    try {
      await installUpdate({ onProgress: (next) => setProgress(next.percent) });
      // Windows 上安装阶段会由安装器结束进程并重新拉起应用，这里主要覆盖 macOS。
      setUpdate(null);
      toast.success('更新已安装，请重新启动应用');
      setStatus('更新已安装，请重新启动应用');
    } catch {
      toast.error('更新安装失败，请稍后重试');
      setStatus('更新安装失败');
    } finally {
      setInstalling(false);
      setProgress(null);
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

        <SettingField label="检查更新" description="检查并安装应用新版本。">
          {platformCapabilities.system.autoUpdate ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => void handleCheckUpdate()}
                  variant="outline"
                  disabled={checking || installing}
                >
                  <RefreshCw className={cn('size-3.5', checking && 'animate-spin')} />
                  {checking ? '检查中...' : '检查更新'}
                </Button>
                {update ? (
                  <Button onClick={() => void handleInstallUpdate()} disabled={installing}>
                    <Download className="size-3.5" />
                    {installing ? '安装中...' : '下载并安装'}
                  </Button>
                ) : null}
                {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
              </div>
              {update?.notes ? (
                <p className="whitespace-pre-line text-xs text-muted-foreground">{update.notes}</p>
              ) : null}
              {installing && progress !== null ? (
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">已下载 {progress}%</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">当前环境不支持应用内更新。</p>
          )}
        </SettingField>
      </FieldGroup>
    </div>
  );
}

export function SettingsPage() {
  const pageActive = usePageActive();
  const navigate = useAppNavigation();
  const setDefaultPresets = useTemplateStore((state) => state.setDefaultPresets);
  const [tab, setTab] = useState('general');
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

  /**
   * 切回设置页时静默重读一次配置。
   *
   * 「存为默认档位」这类写入发生在模板页，本页 keep-alive 挂着不会重挂载；
   * 这里只回填配置，不动 loading，避免每次切页都闪一下「正在加载设置」。
   */
  useEffect(() => {
    if (!pageActive) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const nextConfig = await getConfig();
        if (!cancelled) {
          setConfig(nextConfig);
        }
      } catch (error) {
        console.error('Refresh settings failed:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageActive]);

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

  // 从别处跳进来时（例如导出完成提示里的「更改」）滚到目标设置项并闪一下，
  // 让用户一眼看到该改哪里。地址栏 hash 由导航写入，读完即清掉。
  useEffect(() => {
    if (!pageActive || loading) {
      return;
    }

    const targetId = window.location.hash.replace(/^#/, '');
    if (!targetId) {
      return;
    }

    // 目标可能在别的 tab 里：Radix 不会渲染未激活的 TabsContent，
    // 不先切过去就找不到元素。切完 tab 后这次 effect 会重跑。
    const targetTab = ANCHOR_TABS[targetId];
    if (targetTab && targetTab !== tab) {
      setTab(targetTab);
      return;
    }

    const element = document.getElementById(targetId);
    if (!element) {
      // 目标尚未渲染时不消费 hash，等内容就绪后这次 effect 会重跑
      return;
    }

    window.history.replaceState({}, '', window.location.pathname);
    element.scrollIntoView({ block: 'center' });
    element.classList.add('co-anchor-flash');
    const timer = window.setTimeout(() => element.classList.remove('co-anchor-flash'), 1600);

    return () => window.clearTimeout(timer);
  }, [pageActive, loading, tab]);

  const handleSelectWorkspaceDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    const selected = await openDirectoryDialog();
    if (!selected || Array.isArray(selected)) {
      return;
    }

    // 缓存目录默认跟着工作区目录走，但只在这个值还是默认值时才跟随
    const followsDefaultCache =
      config.cache.directory === defaultCacheDirectory(config.save_directory);

    await withCacheAction(async () => {
      await saveConfig({
        ...config,
        save_directory: selected,
        cache: followsDefaultCache
          ? {
              ...config.cache,
              directory: defaultCacheDirectory(selected),
            }
          : config.cache,
      });
      toast.success('工作区目录已更新');
    });
  }, [config, saveConfig, withCacheAction]);

  const handleOpenWorkspaceDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    try {
      await openDirectory(config.save_directory);
    } catch (error) {
      console.error('Open workspace directory failed:', error);
      toast.error('打开工作区目录失败');
    }
  }, [config]);

  const handleSelectExportDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    const selected = await openDirectoryDialog();
    if (!selected || Array.isArray(selected)) {
      return;
    }

    try {
      await saveConfig({
        ...config,
        output: { ...config.output, default_path: selected },
      });
      toast.success('文件导出目录已更新');
    } catch (error) {
      console.error('Update export directory failed:', error);
      toast.error('更新文件导出目录失败');
    }
  }, [config, saveConfig]);

  /**
   * 删掉一个默认档位。
   *
   * 只改设置里的默认清单，不去动任何照片已有的档位；删到空就等于「没存过默认档位」，
   * 新图片回到内置的单档。
   */
  const handleRemoveDefaultPreset = useCallback(
    async (index: number) => {
      if (!config) {
        return;
      }

      const presets = config.output.presets.filter((_, i) => i !== index);

      try {
        await saveConfig({ ...config, output: { ...config.output, presets } });
        // 同一会话里新导入的图片立刻用上剩下的档位，不必重启
        setDefaultPresets(parseDefaultPresets(presets));
        toast.success('已删除默认档位');
      } catch (error) {
        console.error('Remove default export preset failed:', error);
        toast.error('删除默认档位失败');
      }
    },
    [config, saveConfig, setDefaultPresets],
  );

  const handleOpenExportDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    try {
      await openDirectory(config.output.default_path);
    } catch (error) {
      console.error('Open export directory failed:', error);
      toast.error('打开文件导出目录失败');
    }
  }, [config]);

  const handleSelectCacheDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    const selected = await openDirectoryDialog();
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
      const inUse = getInUseAssetPaths();
      const result = await cleanupCache(config.cache.directory, config.cache.max_age_days, inUse);
      const nextOverview = await getCacheOverview(config.cache.directory);
      setOverview(nextOverview);
      clearAssetCaches();
      toast.success(`已清理 ${result.removed_files} 个过期缓存文件${keepNote(inUse.length)}`);
    });
  }, [config, withCacheAction]);

  const handleClearThumbnails = useCallback(async () => {
    if (!config) {
      return;
    }

    await withCacheAction(async () => {
      const inUse = getInUseAssetPaths();
      const nextOverview = await clearCache(config.cache.directory, 'thumbnails', inUse);
      setOverview(nextOverview);
      clearAssetCaches();
      toast.success(`缩略图缓存已清理${keepNote(inUse.length)}`);
    });
  }, [config, withCacheAction]);

  const handleClearAll = useCallback(async () => {
    if (!config) {
      return;
    }

    await withCacheAction(async () => {
      const inUse = getInUseAssetPaths();
      const nextOverview = await clearCache(config.cache.directory, 'all', inUse);
      setOverview(nextOverview);
      clearAssetCaches();
      toast.success(`全部缓存已清理${keepNote(inUse.length)}`);
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

      {/* 受控 tab：从提示跳进来时（hash 锚点）需要先切到目标所在的 tab */}
      <Tabs
        value={tab}
        onValueChange={setTab}
        orientation="vertical"
        className="min-h-0 flex-1 p-4"
      >
        <TabsList
          variant="line"
          className="w-56 shrink-0 gap-0 border border-border/80 bg-card p-3"
        >
          {TAB_GROUPS.map((group, index) => {
            const GroupIcon = group.icon;

            return (
              <Fragment key={group.label ?? group.items[0].id}>
                {index > 0 ? (
                  // w-full 不能省：TabsList 是 items-center 的 flex 列，没有宽度的
                  // 元素会被压成 0 宽并居中（分隔线会直接看不见）
                  <span aria-hidden="true" className="my-1.5 h-px w-full bg-border/70" />
                ) : null}
                {group.label ? (
                  // 同理，分组标题也必须铺满，否则会被 TabsList 居中
                  <span
                    aria-hidden="true"
                    className="flex w-full items-center gap-2 px-1.5 pt-1 pb-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {GroupIcon ? <GroupIcon className="size-3.5" /> : null}
                    {group.label}
                  </span>
                ) : null}
                {group.items.map((tab) => {
                  const Icon = tab.icon;

                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      // 子项缩进一级，父级图标已表达归属，这里不再重复
                      className={cn(group.label && 'pl-6')}
                      // 分组标题对读屏隐藏，靠可访问名把归属补回去
                      aria-label={group.label ? `${group.label} ${tab.label}` : undefined}
                    >
                      {Icon ? <Icon className="size-3.5" /> : null}
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </Fragment>
            );
          })}
        </TabsList>

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto w-full max-w-5xl pl-4">
            <TabsContent value="general" className="mt-0">
              <GeneralTab
                config={config}
                onSelectWorkspaceDirectory={handleSelectWorkspaceDirectory}
                onOpenWorkspaceDirectory={handleOpenWorkspaceDirectory}
              />
            </TabsContent>
            <TabsContent value="template" className="mt-0">
              <PlaceholderTab
                title="边框水印默认项"
                description="模板与参数的默认值仍保持占位状态，目前这些设置按当前照片在模板页调整。"
                cards={[
                  { title: '默认模板', description: '后续与模板系统联动。' },
                  { title: '默认字体', description: '后续与字体收藏和模板 schema 联动。' },
                ]}
              />
            </TabsContent>
            <TabsContent value="template-export" className="mt-0">
              <TemplateExportDefaultsTab
                presets={config.output.presets}
                onRemovePreset={(index) => void handleRemoveDefaultPreset(index)}
                onGoToTemplate={() => navigate('/template')}
              />
            </TabsContent>
            <TabsContent value="collage" className="mt-0">
              <PlaceholderTab
                title="拼图默认项"
                description="拼图默认项仍保持占位状态，本次优先落地素材缓存链路。"
                cards={[
                  { title: '默认布局', description: '后续与拼图布局预设联动。' },
                  { title: '默认画布样式', description: '后续与拼图渲染设置联动。' },
                ]}
              />
            </TabsContent>
            <TabsContent value="collage-export" className="mt-0">
              <PlaceholderTab
                title="拼图导出"
                description="只对拼图生效的导出默认值仍保持占位状态，目前这些参数在拼图页的导出面板里按次设置。"
                cards={[
                  { title: '默认导出格式', description: '后续与拼图导出管线联动。' },
                  { title: '默认倍率与质量', description: '后续与拼图导出面板联动。' },
                ]}
              />
            </TabsContent>
            <TabsContent value="export" className="mt-0">
              <ExportTab
                config={config}
                onSelectExportDirectory={handleSelectExportDirectory}
                onOpenExportDirectory={handleOpenExportDirectory}
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
        </ScrollArea>
      </Tabs>
    </div>
  );
}
