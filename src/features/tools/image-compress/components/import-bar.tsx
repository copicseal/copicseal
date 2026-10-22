import { FolderOpen, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useTranslate } from '@/shared/i18n';
import { Button } from '@/shared/ui/button';

interface ImportBarProps {
  count: number;
  importing: boolean;
  running: boolean;
  onPickFiles: () => void;
  onPickFolder: () => void;
  onClear: () => void;
}

/** 顶部工具条：导入入口 + 计数 + 清空。 */
export function ImportBar({
  count,
  importing,
  running,
  onPickFiles,
  onPickFolder,
  onClear,
}: ImportBarProps) {
  const t = useTranslate();

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2">
      <Button size="sm" onClick={onPickFiles} disabled={importing}>
        <ImagePlus data-icon="inline-start" />
        {t('compress.import.pickFiles')}
      </Button>
      <Button size="sm" variant="outline" onClick={onPickFolder} disabled={importing}>
        <FolderOpen data-icon="inline-start" />
        {t('compress.import.pickFolder')}
      </Button>

      <span className="ml-1 text-xs text-muted-foreground">
        {t('compress.list.count', { count })}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {importing ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {t('compress.import.scanning')}
          </span>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onClear} disabled={running || count === 0}>
          <Trash2 data-icon="inline-start" />
          {t('compress.import.clear')}
        </Button>
      </div>
    </header>
  );
}
