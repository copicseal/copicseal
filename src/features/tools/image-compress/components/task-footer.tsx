import { FolderOpen, Play, RotateCcw, Square } from 'lucide-react';
import type { CompressProgress } from '@/platform/contracts';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import type { CompressTask } from '../types';
import { formatFileSize, formatPercent, sizeChange } from '../utils/format';

interface TaskFooterProps {
  tasks: CompressTask[];
  progress: CompressProgress | null;
  running: boolean;
  canStart: boolean;
  /** 不能开始的原因（按钮的 title / 状态条文案） */
  hint: string | null;
  /** 有成功结果且输出到统一目录时，显示「打开输出目录」 */
  outputDir: string | null;
  onStart: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onOpenOutput: () => void;
}

/** 底部：任务统计 + 整体进度 + 开始 / 取消 / 重试 / 打开输出目录。 */
export function TaskFooter({
  tasks,
  progress,
  running,
  canStart,
  hint,
  outputDir,
  onStart,
  onCancel,
  onRetry,
  onOpenOutput,
}: TaskFooterProps) {
  const t = useTranslate();

  const counts = tasks.reduce(
    (accumulator, task) => {
      if (task.status === 'running') {
        accumulator.running += 1;
      } else if (task.status === 'done') {
        accumulator.done += 1;
      } else if (task.status === 'failed') {
        accumulator.failed += 1;
      } else if (task.status === 'cancelled') {
        accumulator.cancelled += 1;
      } else {
        accumulator.waiting += 1;
      }
      return accumulator;
    },
    { waiting: 0, running: 0, done: 0, failed: 0, cancelled: 0 },
  );

  const finished = tasks.filter((task) => task.result);
  const totalOriginal = finished.reduce((sum, task) => sum + (task.result?.original_bytes ?? 0), 0);
  const totalOutput = finished.reduce((sum, task) => sum + (task.result?.output_bytes ?? 0), 0);
  const change = sizeChange(totalOriginal, totalOutput);

  const done = progress?.done ?? 0;
  const total = progress?.total ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <footer className="flex shrink-0 flex-col gap-2 rounded-lg border border-border/80 bg-card/40 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <Stat label={t('compress.footer.count', { count: tasks.length })} />
        {counts.waiting > 0 ? (
          <Stat label={t('compress.footer.waiting', { count: counts.waiting })} />
        ) : null}
        {counts.running > 0 ? (
          <Stat label={t('compress.footer.running', { count: counts.running })} tone="primary" />
        ) : null}
        {counts.done > 0 ? (
          <Stat label={t('compress.footer.succeeded', { count: counts.done })} tone="success" />
        ) : null}
        {counts.failed > 0 ? (
          <Stat label={t('compress.footer.failed', { count: counts.failed })} tone="danger" />
        ) : null}
        {counts.cancelled > 0 ? (
          <Stat label={t('compress.footer.cancelled', { count: counts.cancelled })} />
        ) : null}

        {finished.length > 0 && !running ? (
          <span
            className={cn(
              'ml-auto',
              change.bigger
                ? 'text-destructive'
                : change.saved > 0
                  ? 'text-emerald-600'
                  : 'text-muted-foreground',
            )}
          >
            {change.bigger
              ? t('compress.footer.summaryBigger', {
                  succeeded: counts.done,
                  failed: counts.failed,
                  saved: formatFileSize(Math.abs(change.saved)),
                  percent: formatPercent(Math.abs(change.percent)),
                })
              : t('compress.footer.summary', {
                  succeeded: counts.done,
                  failed: counts.failed,
                  saved: formatFileSize(Math.abs(change.saved)),
                  percent: formatPercent(change.percent),
                })}
          </span>
        ) : hint ? (
          <span className="ml-auto text-muted-foreground">{hint}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]"
            style={{ width: `${running ? percent : finished.length > 0 ? 100 : 0}%` }}
          />
        </div>

        {running ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {t('compress.footer.progress', { done, total })}
          </span>
        ) : null}

        {counts.failed > 0 && !running ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCcw data-icon="inline-start" />
            {t('compress.footer.retryFailed')}
          </Button>
        ) : null}

        {outputDir && finished.length > 0 && !running ? (
          <Button size="sm" variant="ghost" onClick={onOpenOutput}>
            <FolderOpen data-icon="inline-start" />
            {t('compress.footer.openOutput')}
          </Button>
        ) : null}

        {running ? (
          <Button size="sm" variant="outline" onClick={onCancel}>
            <Square data-icon="inline-start" />
            {t('compress.footer.cancel')}
          </Button>
        ) : (
          <Button size="sm" onClick={onStart} disabled={!canStart}>
            <Play data-icon="inline-start" />
            {t('compress.footer.start')}
          </Button>
        )}
      </div>
    </footer>
  );
}

function Stat({ label, tone }: { label: string; tone?: 'primary' | 'success' | 'danger' }) {
  return (
    <span
      className={cn(
        'tabular-nums',
        tone === 'primary' && 'text-primary',
        tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
        tone === 'danger' && 'text-destructive',
      )}
    >
      {label}
    </span>
  );
}
