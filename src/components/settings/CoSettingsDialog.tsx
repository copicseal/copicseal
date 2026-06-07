import { check } from '@tauri-apps/plugin-updater';
import {
  Box,
  Cog,
  Database,
  Download,
  FileText,
  Info,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchRemoteTemplates, type RemoteTemplate } from '@/lib/remote-templates';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'general', label: '通用', icon: Cog },
  { id: 'export-presets', label: '导出预设', icon: Download },
  { id: 'template-presets', label: '模板预设', icon: Box },
  { id: 'template-library', label: '模板库', icon: FileText },
  { id: 'device-database', label: '设备数据库', icon: Database },
  { id: 'about', label: '关于', icon: Info },
] as const;

const MOCK_DEVICES = [
  { id: '1', type: 'camera', brand: 'SONY', model: 'ILCE-7M4', lens: 'FE 24-70mm F2.8 GM II' },
  { id: '2', type: 'camera', brand: 'Canon', model: 'EOS R5' },
  { id: '3', type: 'lens', brand: 'Canon', model: 'RF 24-105mm F4 L IS USM' },
];

const MOCK_TEMPLATES = [
  { id: '1', name: '框架白边', author: 'Copicseal', enabled: true },
  { id: '2', name: 'PS 启动窗', author: '社区', enabled: true },
  { id: '3', name: '极简水印', author: 'Copicseal', enabled: false },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return <span className="text-[10px] font-medium text-muted-foreground">{children}</span>;
}

function GeneralTab() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <SectionLabel>主题</SectionLabel>
        <RadioGroup defaultValue="system" className="flex gap-4" orientation="horizontal">
          {[
            { value: 'light', label: '浅色' },
            { value: 'dark', label: '深色' },
            { value: 'system', label: '跟随系统' },
          ].map(({ value, label }) => (
            <div key={value} className="flex items-center gap-1.5">
              <RadioGroupItem value={value} id={`theme-${value}`} />
              <label htmlFor={`theme-${value}`} className="cursor-pointer">
                {label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-1.5">
        <SectionLabel>界面语言</SectionLabel>
        <Select defaultValue="zh-CN">
          <SelectTrigger className="h-7 text-xs w-[180px]">
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
      </div>

      <div className="space-y-1.5">
        <SectionLabel>默认保存目录</SectionLabel>
        <div className="flex items-center gap-1.5">
          <Input defaultValue="~/Documents/Copicseal" readOnly className="h-7 text-[10px] flex-1" />
          <Button variant="outline" size="sm" className="h-7 text-[10px]">
            选择
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExportPresetsTab() {
  const [presets, setPresets] = useState<string[]>(['默认', 'Web 优化']);

  const remove = (name: string) => setPresets((p) => p.filter((n) => n !== name));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel>已保存的导出预设</SectionLabel>
        <Button variant="ghost" size="icon-xs">
          <Plus className="size-3" />
        </Button>
      </div>
      <div className="space-y-1">
        {presets.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-muted-foreground">暂无预设</p>
        ) : (
          presets.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <span>{name}</span>
              <Button variant="ghost" size="icon-xs" onClick={() => remove(name)}>
                <Trash2 className="size-3 text-muted-foreground" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TemplatePresetsTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel>已保存的模板预设</SectionLabel>
        <Button variant="ghost" size="icon-xs">
          <Plus className="size-3" />
        </Button>
      </div>
      <p className="py-4 text-center text-[10px] text-muted-foreground">暂无预设</p>
    </div>
  );
}

function TemplateLibraryTab() {
  const [remoteTemplates, setRemoteTemplates] = useState<RemoteTemplate[]>([]);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRemoteTemplates();
      setRemoteTemplates(data);
      if (data.length === 0) setError('暂无远程模板');
    } catch {
      setError('获取失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const all = [
    ...MOCK_TEMPLATES.map((t) => ({ ...t, remote: false })),
    ...remoteTemplates.map((t) => ({ ...t, remote: true })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel>远程模板</SectionLabel>
        <Button variant="ghost" size="icon-xs" title="刷新" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? 'size-3 animate-spin' : 'size-3'} />
        </Button>
      </div>
      <div className="space-y-1">
        {all.map((tpl) => (
          <div
            key={tpl.id}
            className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[10px]">{tpl.name}</span>
                {tpl.remote && (
                  <span className="shrink-0 rounded bg-blue-500/10 px-1 py-0.5 text-[8px] text-blue-500">
                    远程
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{tpl.author}</span>
            </div>
            <Switch
              checked={enabled.has(tpl.id) || !tpl.remote}
              onCheckedChange={() => toggle(tpl.id)}
              size="sm"
            />
          </div>
        ))}
        {loading && (
          <div className="flex justify-center py-2">
            <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
          </div>
        )}
        {!loading && error && all.length === 0 && (
          <p className="py-2 text-center text-[10px] text-muted-foreground">{error}</p>
        )}
      </div>
    </div>
  );
}

function DeviceDatabaseTab() {
  const [devices] = useState(MOCK_DEVICES);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel>设备列表</SectionLabel>
        <Button variant="ghost" size="icon-xs">
          <Plus className="size-3" />
        </Button>
      </div>
      <div className="space-y-1">
        {devices.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'shrink-0 rounded px-1 py-0.5 text-[10px] font-medium',
                    d.type === 'camera'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {d.type === 'camera' ? '相机' : '镜头'}
                </span>
                <span className="text-[10px] text-muted-foreground">{d.brand}</span>
              </div>
              <span className="truncate">{d.model}</span>
            </div>
            <Button variant="ghost" size="icon-xs">
              <Trash2 className="size-3 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutTab() {
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleCheckUpdate = async () => {
    setChecking(true);
    setUpdateStatus(null);
    try {
      const update = await check();
      if (update) {
        setUpdateStatus(`发现新版本 ${update.version}`);
      } else {
        setUpdateStatus('已是最新版本');
      }
    } catch {
      setUpdateStatus('检查更新失败');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <Settings className="size-6 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold">Copicseal</h3>
          <p className="text-[10px] text-muted-foreground">v0.2.0-alpha</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">版本号</span>
          <span className="tabular-nums">0.2.0</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">技术栈</span>
          <span className="text-[10px] text-muted-foreground">Tauri 2 + React 19</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">许可证</span>
          <span className="text-[10px] text-muted-foreground">Proprietary</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full text-xs"
        size="sm"
        onClick={handleCheckUpdate}
        disabled={checking}
      >
        <RefreshCw className={checking ? 'size-3 animate-spin' : 'size-3'} />
        {checking ? '检查中...' : '检查更新'}
      </Button>
      {updateStatus && (
        <p className="text-center text-[10px] text-muted-foreground">{updateStatus}</p>
      )}
    </div>
  );
}

interface CoSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoSettingsDialog({ open, onOpenChange }: CoSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl p-0 gap-0"
        showCloseButton={false}
      >
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>管理应用偏好、预设和设备数据</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" orientation="vertical" className="flex min-h-0 flex-1">
          <TabsList
            variant="line"
            className="w-32 shrink-0 flex-col items-stretch gap-0 rounded-none border-r px-2 py-2"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="justify-start gap-2 px-2 py-1.5"
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent">
            {TABS.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                {tab.id === 'general' && <GeneralTab />}
                {tab.id === 'export-presets' && <ExportPresetsTab />}
                {tab.id === 'template-presets' && <TemplatePresetsTab />}
                {tab.id === 'template-library' && <TemplateLibraryTab />}
                {tab.id === 'device-database' && <DeviceDatabaseTab />}
                {tab.id === 'about' && <AboutTab />}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
