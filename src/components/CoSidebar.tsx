import { check } from '@tauri-apps/plugin-updater';
import { Grid3x3, Info, LayoutTemplate, Menu, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CoSidebarProps {
  onOpenSettings?: (tab?: string) => void;
}

export function CoSidebar({ onOpenSettings }: CoSidebarProps) {
  const handleCheckUpdate = async () => {
    const tid = toast.loading('检查中...');
    try {
      const update = await check();
      if (update) {
        toast.success(`发现新版本 ${update.version}`, { id: tid });
      } else {
        toast.success('已是最新版本', { id: tid });
      }
    } catch {
      toast.error('检查更新失败', { id: tid });
    }
  };

  return (
    <div className="flex h-full w-[60px] shrink-0 flex-col border-r bg-muted/30 py-2">
      <div className="flex flex-col items-center gap-1">
        <Avatar className="mb-2 size-9">
          <AvatarFallback className="bg-muted-foreground/15 text-muted-foreground text-[10px]">
            <Settings className="size-5" />
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          title="边框"
          className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
        >
          <LayoutTemplate className="size-5 text-muted-foreground" />
        </button>

        <button
          type="button"
          title="拼图（即将推出）"
          onClick={() => toast('即将推出')}
          className="flex size-9 items-center justify-center rounded-lg opacity-30 transition-colors hover:bg-muted"
        >
          <Grid3x3 className="size-5 text-muted-foreground" />
        </button>
      </div>

      <div className="mt-auto flex flex-col items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="菜单"
              className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
            >
              <Menu className="size-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="min-w-36">
            <DropdownMenuItem onClick={() => onOpenSettings?.()}>
              <Settings className="size-3.5" />
              设置
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenSettings?.('about')}>
              <Info className="size-3.5" />
              关于
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCheckUpdate}>
              <RefreshCw className="size-3.5" />
              检查更新
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
