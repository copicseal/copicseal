import { FolderOpen } from 'lucide-react';
import { useTranslate } from '@/shared/i18n';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

interface CoDirectoryFieldProps {
  /** 当前目录的绝对路径 */
  directory: string;
  onOpen: () => void;
  onSelect: () => void;
}

/**
 * 目录设置行：只读路径 + 打开 / 选择。
 *
 * 绝对路径通常比控件宽，输入框里显示不全，所以悬浮（或键盘聚焦）时用气泡给出完整路径。
 * 标题与描述由调用方自己的 SettingField 负责，这里只管控件本身。
 */
export function CoDirectoryField({ directory, onOpen, onSelect }: CoDirectoryFieldProps) {
  const t = useTranslate();

  return (
    <div className="flex max-w-3xl items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Input value={directory} readOnly />
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="max-w-96 break-all">
            {directory}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button variant="outline" onClick={onOpen}>
        <FolderOpen data-icon="inline-start" />
        {t('common.action.open')}
      </Button>
      <Button variant="outline" onClick={onSelect}>
        <FolderOpen data-icon="inline-start" />
        {t('common.action.select')}
      </Button>
    </div>
  );
}
