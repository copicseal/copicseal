import { Ban, Check, CircleAlert, ImageOff, Loader2, Minus, X } from 'lucide-react';
import { useState } from 'react';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { type MessageKey, useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { ScrollArea } from '@/shared/ui/scroll-area';
import type { CompressTask } from '../types';
import { formatDimensions, formatFileSize } from '../utils/format';

const STAGE_KEYS: Record<string, MessageKey> = {
  decoding: 'compress.list.stage.decoding',
  resizing: 'compress.list.stage.resizing',
  encoding: 'compress.list.stage.encoding',
  measuring: 'compress.list.stage.measuring',
  writing: 'compress.list.stage.writing',
};

interface TaskListProps {
  tasks: CompressTask[];
  selectedId: string | null;
  running: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

/** 左栏：缩略图 + 文件名 + 尺寸/体积 + 状态。 */
export function TaskList({ tasks, selectedId, running, onSelect, onRemove }: TaskListProps) {
  const t = useTranslate();

  return (
    <aside className="flex w-52 shrink-0 flex-col overflow-hidden rounded-lg border border-border/80 bg-card/40">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <span className="text-[11px] text-muted-foreground">
          {t('compress.list.count', { count: tasks.length })}
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          {t('compress.list.selectHint')}
        </span>
      </div>

      {/*
        用项目自绘的 ScrollArea（不要原生滚动条）。Radix 视口内部默认是 `display: table`，
        长文件名 + 徽标会按 min-content 把内容撑宽再被裁掉，所以用 viewportClassName 把它改回
        普通块级布局，宽度跟面板走。
      */}
      <ScrollArea className="min-h-0 flex-1" viewportClassName="[&>div]:!block [&>div]:!w-full">
        <ul className="flex flex-col gap-0.5 p-1">
          {tasks.map((task) => {
            const active = task.id === selectedId;
            const meta = [formatDimensions(task.width, task.height), formatFileSize(task.size)]
              .filter(Boolean)
              .join(' · ');

            return (
              <li key={task.id}>
                <div
                  className={cn(
                    'group flex w-full items-center gap-1.5 rounded-md px-1 py-1 transition-colors',
                    active ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-accent/60',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(task.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <TaskThumbnail task={task} />

                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[11px] font-medium">{task.name}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{meta}</span>
                      {task.status === 'running' ? (
                        <span className="truncate text-[10px] text-primary">
                          {t(
                            STAGE_KEYS[task.stage] ?? ('compress.list.stage.default' as MessageKey),
                          )}
                        </span>
                      ) : task.blockedReason ? (
                        <span className="truncate text-[10px] text-destructive">
                          {task.blockedReason}
                        </span>
                      ) : task.status === 'done' && task.result ? (
                        <span className="truncate text-[10px] text-emerald-600 dark:text-emerald-400">
                          {formatFileSize(task.result.output_bytes)}
                        </span>
                      ) : null}
                    </span>

                    <TaskStatusIcon task={task} />
                  </button>

                  <button
                    type="button"
                    aria-label={t('compress.list.remove')}
                    title={t('compress.list.remove')}
                    onClick={() => onRemove(task.id)}
                    disabled={running}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 disabled:pointer-events-none"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </aside>
  );
}

function TaskThumbnail({ task }: { task: CompressTask }) {
  const [failed, setFailed] = useState(false);

  if (task.thumbnailPath && !failed) {
    return (
      <img
        src={platformRuntime.toNativeFileUrl(task.thumbnailPath)}
        alt=""
        className="size-9 shrink-0 rounded border border-border/60 object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded border border-border/60 bg-muted/50 text-muted-foreground">
      <ImageOff className="size-3.5" />
    </span>
  );
}

function TaskStatusIcon({ task }: { task: CompressTask }) {
  if (task.blockedReason || task.status === 'failed') {
    return <CircleAlert className="size-3.5 shrink-0 text-destructive" />;
  }

  switch (task.status) {
    case 'running':
      return <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />;
    case 'done':
      return <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />;
    case 'skipped':
      return <Minus className="size-3.5 shrink-0 text-muted-foreground" />;
    case 'cancelled':
      return <Ban className="size-3.5 shrink-0 text-muted-foreground" />;
    default:
      return null;
  }
}
