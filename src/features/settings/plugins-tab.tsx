import { ArrowUp, FolderOpen, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { PluginInstallProgress, PluginManifest, PluginState } from '@/platform';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { CoPanelSection } from '@/shared/components/co-panel-section';
import { useTranslate } from '@/shared/i18n';
import { formatFileSize } from '@/shared/lib/file-size';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

/** 内置官方源：配置为空时的回落值，与 Rust 侧 `config::default_plugin_sources()` 保持一致 */
const DEFAULT_SOURCES = ['https://raw.githubusercontent.com/copicseal/copicseal-static/main'];

/** 平台标识转展示名 */
function systemLabel(platform: string): string {
  if (platform === 'macos') return 'macOS';
  if (platform === 'linux') return 'Linux';
  return platform;
}

/** 源只显示主机名，完整地址太长 */
function sourceHost(source: string): string {
  try {
    return new URL(source).host;
  } catch {
    return source;
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface PluginsTabProps {
  /** 配置里的下载源；顺序即优先级，为空时用内置官方源 */
  sources: string[];
  onChangeSources: (sources: string[]) => void;
}

/**
 * 插件页：列出内置插件目录里的插件，负责安装 / 更新 / 卸载，以及维护下载源。
 *
 * 插件是「下载第三方可执行组件」，所以装前一定校验清单里的体积与 sha256（由 Rust 侧完成），
 * 拿不到清单就不允许安装；卸载是破坏性操作，先确认。自定义源属于信任扩展，界面里有明确提示。
 */
export function PluginsTab({ sources, onChangeSources }: PluginsTabProps) {
  const t = useTranslate();
  const [plugins, setPlugins] = useState<PluginState[]>([]);
  /** 已拉到的清单（成功后一直保留，刷新期间不清空，避免闪一下错误态） */
  const [manifests, setManifests] = useState<Record<string, PluginManifest>>({});
  /** 清单来自哪个源 */
  const [manifestSources, setManifestSources] = useState<Record<string, string>>({});
  /** 清单拉取失败的原因（保留上次清单时只作为提示） */
  const [manifestErrors, setManifestErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [draftSource, setDraftSource] = useState('');
  const busyRef = useRef<string | null>(null);
  const sourcesRef = useRef(sources);

  busyRef.current = busyId;
  sourcesRef.current = sources;

  // 配置里的数组每次保存都会换引用：只有在内容真的变了才重新检查
  const sourcesKey = sources.join('\n');
  const effectiveSources = sources.length > 0 ? sources : DEFAULT_SOURCES;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await platformRuntime.listPlugins();
      setPlugins(list);

      const results = await Promise.all(
        list.map(async (plugin) => {
          if (!plugin.supported) {
            return null;
          }
          try {
            const result = await platformRuntime.fetchPluginManifest(plugin.id, sourcesRef.current);
            return { id: plugin.id, result, error: null as string | null };
          } catch (error) {
            console.error('获取插件清单失败:', error);
            return { id: plugin.id, result: null, error: describeError(error) };
          }
        }),
      );

      setManifests((prev) => {
        const next = { ...prev };
        for (const item of results) {
          if (item?.result) {
            next[item.id] = item.result.manifest;
          }
        }
        return next;
      });
      setManifestSources((prev) => {
        const next = { ...prev };
        for (const item of results) {
          if (item?.result) {
            next[item.id] = item.result.source;
          }
        }
        return next;
      });
      setManifestErrors(() => {
        const next: Record<string, string> = {};
        for (const item of results) {
          if (item?.error) {
            next[item.id] = item.error;
          }
        }
        return next;
      });
    } catch (error) {
      console.error('读取插件状态失败:', error);
      toast.error(t('settings.plugins.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: 源内容变化（sourcesKey）时重新检查，数组引用本身不参与
  useEffect(() => {
    void refresh();
  }, [refresh, sourcesKey]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    platformRuntime
      .onPluginInstallProgress((payload: PluginInstallProgress) => {
        if (payload.id !== busyRef.current) {
          return;
        }
        setProgress(payload.percent ?? null);
      })
      .then((cleanup) => {
        unlisten = cleanup;
      })
      .catch((error) => {
        console.error('订阅插件安装进度失败:', error);
      });

    return () => unlisten?.();
  }, []);

  const handleInstall = async (plugin: PluginState) => {
    setBusyId(plugin.id);
    setProgress(0);
    try {
      const outcome = await platformRuntime.installPlugin(plugin.id, sourcesRef.current);
      setPlugins((prev) =>
        prev.map((item) => (item.id === outcome.state.id ? outcome.state : item)),
      );
      toast.success(t('settings.plugins.installSuccess', { name: plugin.name }), {
        description: t('settings.plugins.fromSource', { source: sourceHost(outcome.source) }),
      });
    } catch (error) {
      console.error('安装插件失败:', error);
      toast.error(t('settings.plugins.installFailed'), { description: describeError(error) });
    } finally {
      setBusyId(null);
      setProgress(null);
    }
  };

  const runUninstall = async (plugin: PluginState) => {
    setBusyId(plugin.id);
    try {
      await platformRuntime.removePlugin(plugin.id);
      toast.success(t('settings.plugins.uninstallSuccess', { name: plugin.name }));
      await refresh();
    } catch (error) {
      console.error('卸载插件失败:', error);
      toast.error(t('settings.plugins.uninstallFailed'), { description: describeError(error) });
    } finally {
      setBusyId(null);
    }
  };

  const handleUninstall = (plugin: PluginState) => {
    toast(t('settings.plugins.uninstallConfirm', { name: plugin.name }), {
      description: t('settings.plugins.uninstallConfirmDescription'),
      action: {
        label: t('settings.plugins.uninstall'),
        onClick: () => void runUninstall(plugin),
      },
      cancel: t('settings.plugins.cancel'),
    });
  };

  const handleOpenDirectory = async (plugin: PluginState) => {
    try {
      await platformRuntime.openDirectory(plugin.directory);
    } catch (error) {
      console.error('打开插件目录失败:', error);
      toast.error(t('settings.plugins.openDirectoryFailed'));
    }
  };

  const handleOpenSource = async (plugin: PluginState) => {
    try {
      await platformRuntime.openExternal(plugin.homepage);
    } catch (error) {
      console.error('打开来源链接失败:', error);
      toast.error(t('settings.plugins.openSourceFailed'));
    }
  };

  const handleAddSource = () => {
    const value = draftSource.trim().replace(/\/+$/, '');

    if (!value) {
      return;
    }
    if (!/^https?:\/\//i.test(value)) {
      toast.error(t('settings.plugins.sources.invalid'));
      return;
    }
    if (effectiveSources.includes(value)) {
      toast.error(t('settings.plugins.sources.exists'));
      return;
    }

    onChangeSources([...effectiveSources, value]);
    setDraftSource('');
  };

  const handleRemoveSource = (source: string) => {
    onChangeSources(effectiveSources.filter((item) => item !== source));
  };

  const handlePromoteSource = (source: string) => {
    onChangeSources([source, ...effectiveSources.filter((item) => item !== source)]);
  };

  const handleResetSources = () => {
    onChangeSources([...DEFAULT_SOURCES]);
  };

  return (
    <div id="plugins-section" className="space-y-4">
      <div className="rounded-lg border border-border/80 bg-card px-5 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">{t('settings.plugins.title')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('settings.plugins.description')}
            </p>
          </div>
          <Button
            type="button"
            variant="plain"
            size="sm"
            disabled={loading}
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            {t('settings.plugins.refresh')}
          </Button>
        </div>
      </div>

      {/* 下载源：一般不用改，默认收起，头部只留一行摘要 */}
      <CoPanelSection
        title={t('settings.plugins.sources.title')}
        description={t('settings.plugins.sources.description')}
        defaultOpen={false}
        actions={
          <span className="text-[10px] text-muted-foreground">
            {sourceHost(effectiveSources[0] ?? '')}
            {effectiveSources.length > 1 ? ` +${effectiveSources.length - 1}` : ''}
          </span>
        }
      >
        <ul className="space-y-1">
          {effectiveSources.map((source, index) => (
            <li
              key={source}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2 py-1"
            >
              <span className="shrink-0 text-[10px] text-muted-foreground">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/90">
                {source}
              </span>
              {index === 0 ? (
                <span className="shrink-0 border border-primary/40 bg-primary/10 px-1 text-[10px] text-primary">
                  {t('settings.plugins.sources.priority')}
                </span>
              ) : (
                <Button
                  type="button"
                  variant="plain"
                  size="sm"
                  aria-label={t('settings.plugins.sources.promote')}
                  onClick={() => handlePromoteSource(source)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="plain"
                size="sm"
                disabled={effectiveSources.length <= 1}
                aria-label={t('settings.plugins.uninstall')}
                onClick={() => handleRemoveSource(source)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center gap-2">
          <Input
            value={draftSource}
            placeholder={t('settings.plugins.sources.placeholder')}
            onChange={(event) => setDraftSource(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleAddSource();
              }
            }}
          />
          <Button type="button" variant="plain" size="sm" onClick={handleAddSource}>
            <Plus className="size-3.5" />
            {t('settings.plugins.sources.add')}
          </Button>
          <Button type="button" variant="plain" size="sm" onClick={handleResetSources}>
            {t('settings.plugins.sources.reset')}
          </Button>
        </div>

        <p className="mt-2 text-[10px] text-muted-foreground">
          {t('settings.plugins.sources.warning')}
        </p>
      </CoPanelSection>

      {loading && plugins.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">{t('settings.plugins.checking')}</p>
      ) : plugins.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">{t('settings.plugins.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {plugins.map((plugin) => {
            const manifest = manifests[plugin.id] ?? null;
            const manifestError = manifestErrors[plugin.id];
            const activeVersion = plugin.active_version;
            const installedBytes = plugin.installed[plugin.installed.length - 1]?.size ?? 0;
            const remoteVersion = manifest?.version ?? null;
            const busy = busyId === plugin.id;
            /** 系统里已经有这个组件（例如包管理器装的 exiftool）：提示出来，但仍允许装一份本地的 */
            const systemReady = Boolean(plugin.system_path);
            /** 该组件靠系统 perl 跑，而系统里没有 perl：让用户去官网自取 */
            const perlMissing = plugin.perl_available === false;
            const canInstall = plugin.supported && Boolean(manifest) && !busy && !perlMissing;
            const hasUpdate = Boolean(remoteVersion && remoteVersion !== activeVersion);

            return (
              <li
                key={plugin.id}
                className="rounded-lg border border-border/70 bg-background/60 px-3 py-2"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="truncate text-xs font-medium text-foreground">
                        {plugin.name}
                      </span>
                      {/* 系统里已经有、本地又没装时，不要再提「未安装」——只说系统那份 */}
                      {systemReady && !activeVersion ? null : (
                        <span
                          className={cn(
                            'shrink-0 border px-1 text-[10px]',
                            activeVersion
                              ? 'border-border bg-muted/60 text-foreground'
                              : 'border-dashed border-border text-muted-foreground',
                          )}
                        >
                          {activeVersion
                            ? t('settings.plugins.installedVersion', { version: activeVersion })
                            : t('settings.plugins.notInstalled')}
                        </span>
                      )}
                      {/* 系统里已经有了（带版本号）；装一份本地的也仍然可以用 */}
                      {systemReady ? (
                        <span
                          className="shrink-0 border border-primary/40 bg-primary/10 px-1 text-[10px] text-primary"
                          title={t('settings.plugins.systemInstalledHint', {
                            path: plugin.system_path ?? '',
                          })}
                        >
                          {plugin.system_version
                            ? t('settings.plugins.systemInstalledVersion', {
                                version: plugin.system_version,
                              })
                            : t('settings.plugins.systemInstalled')}
                        </span>
                      ) : null}
                      {hasUpdate ? (
                        <span className="shrink-0 border border-primary/40 bg-primary/10 px-1 text-[10px] text-primary">
                          {t('settings.plugins.updateAvailable', { version: remoteVersion ?? '' })}
                        </span>
                      ) : null}
                      {activeVersion && !hasUpdate ? (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {t('settings.plugins.upToDate')}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">{plugin.description}</p>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      <button
                        type="button"
                        className="underline underline-offset-2 hover:text-foreground"
                        onClick={() => void handleOpenSource(plugin)}
                      >
                        {t('settings.plugins.source')}
                      </button>
                      {/* 「检查中」与「平台不支持」都跟在「来源」后面同一行，不单独占一行 */}
                      {plugin.supported && !manifest && loading ? (
                        <span>{t('settings.plugins.checking')}</span>
                      ) : null}
                      {plugin.supported ? null : (
                        <span>
                          {plugin.platform === 'macos'
                            ? t('settings.plugins.notNeeded', {
                                system: systemLabel(plugin.platform),
                              })
                            : t('settings.plugins.noAsset')}
                        </span>
                      )}
                      {/* Perl 版组件在缺 perl 的系统上装不了，给一条官网自取的出路 */}
                      {perlMissing ? (
                        <>
                          <span className="text-destructive">
                            {t('settings.plugins.perlMissing')}
                          </span>
                          <button
                            type="button"
                            className="underline underline-offset-2 hover:text-foreground"
                            onClick={() => {
                              void platformRuntime
                                .openExternal('https://exiftool.org/')
                                .catch((error) => console.error('打开下载页失败:', error));
                            }}
                          >
                            {t('settings.plugins.perlMissingLink')}
                          </button>
                        </>
                      ) : null}
                      {manifestSources[plugin.id] ? (
                        <span>
                          {t('settings.plugins.fromSource', {
                            source: sourceHost(manifestSources[plugin.id] as string),
                          })}
                        </span>
                      ) : null}
                      {remoteVersion ? (
                        <>
                          <span>
                            {t('settings.plugins.remoteVersion', { version: remoteVersion })}
                          </span>
                          <span>
                            {t('settings.plugins.remoteSize', {
                              size: formatFileSize(
                                manifest?.assets.find((asset) => asset.name === plugin.asset?.file)
                                  ?.size,
                              ),
                            })}
                          </span>
                        </>
                      ) : null}
                      {installedBytes > 0 ? (
                        <span>
                          {t('settings.plugins.installedSize', {
                            size: formatFileSize(installedBytes),
                          })}
                        </span>
                      ) : null}
                    </div>

                    {plugin.supported && !manifest && !loading && manifestError ? (
                      <p className="mt-1 text-[10px] text-destructive" title={manifestError}>
                        {t('settings.plugins.manifestFailed')}
                        <span className="ml-1 text-muted-foreground">
                          {t('settings.plugins.manifestFailedHint')}
                        </span>
                      </p>
                    ) : null}

                    {plugin.supported && manifest && manifestError ? (
                      <p className="mt-1 text-[10px] text-muted-foreground" title={manifestError}>
                        {t('settings.plugins.staleVersion')}
                      </p>
                    ) : null}

                    {busy ? (
                      <div className="mt-2 space-y-1">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-200"
                            style={{ width: `${progress ?? 0}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {t('settings.plugins.installing')}
                          {progress === null
                            ? ''
                            : ` · ${t('settings.plugins.progress', { percent: progress })}`}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="plain"
                      size="sm"
                      disabled={!canInstall}
                      onClick={() => void handleInstall(plugin)}
                    >
                      {activeVersion ? t('settings.plugins.update') : t('settings.plugins.install')}
                    </Button>
                    {activeVersion ? (
                      <>
                        <Button
                          type="button"
                          variant="plain"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleOpenDirectory(plugin)}
                        >
                          <FolderOpen className="size-4" />
                          {t('settings.plugins.openDirectory')}
                        </Button>
                        <Button
                          type="button"
                          variant="plain"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleUninstall(plugin)}
                        >
                          <Trash2 className="size-4" />
                          {t('settings.plugins.uninstall')}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
