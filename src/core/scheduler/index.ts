import { createExportTask, getExportTaskState } from '@/infra/export';

export async function runScheduledExports<T>({
  items,
  runner,
  onProgress,
}: {
  items: T[];
  runner: (item: T, index: number) => Promise<void>;
  onProgress?: (completed: number, total: number) => void;
}) {
  const taskId = createExportTask(items.length);

  for (let index = 0; index < items.length; index += 1) {
    const state = getExportTaskState(taskId);
    if (state?.cancelled) {
      break;
    }

    await runner(items[index], index);
    onProgress?.(index + 1, items.length);
  }

  return taskId;
}
