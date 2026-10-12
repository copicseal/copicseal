import { toast } from 'sonner';
import type { ImportFailure, ImportPhotoOptions } from '@/platform/contracts';
import { importFailureReason } from '@/platform/errors';
import { translate } from '@/shared/i18n';
import type { ImportedPhoto } from '@/shared/types/photo';

/** 汇总提示里最多列出的文件名数量，超出的折叠成「等 N 张」。 */
const MAX_LISTED_FAILURES = 3;

/**
 * 导入失败的统一提示。
 *
 * 单张失败给一条错误提示；多张失败合并成一条汇总，避免一次拖进十几张 HEIC 时刷屏。
 * 逐张的原因已经写进控制台（见 `asset-service`），这里只负责让用户知道「哪些被跳过了」。
 */
export function notifyImportFailures(failures: readonly ImportFailure[]): void {
  if (failures.length === 0) {
    return;
  }

  if (failures.length === 1) {
    toast.error(translate('common.import.failedOne', { name: failures[0].name }), {
      description: failures[0].reason,
    });
    return;
  }

  const listed = failures
    .slice(0, MAX_LISTED_FAILURES)
    .map((failure) => failure.name)
    .join('、');
  const more =
    failures.length > MAX_LISTED_FAILURES
      ? ` ${translate('common.import.failedMore', { count: failures.length - MAX_LISTED_FAILURES })}`
      : '';

  toast.warning(translate('common.import.failedMany', { count: failures.length }), {
    description: `${listed}${more} · ${failures[0].reason}`,
  });
}

/**
 * 整批性失败（读配置、打开对话框等）的兜底提示。
 *
 * 单文件隔离兜不住这类错误：走到这里说明一张都没能导入。
 */
export function notifyImportAborted(error: unknown): void {
  console.error('导入失败:', error);
  toast.error(translate('common.import.failedAborted', { reason: importFailureReason(error) }));
}

/**
 * 包一层导入：收集逐张失败并在结束时统一提示。
 *
 * 只接管「单张失败」，真正的批次级异常照旧抛给调用方去提示与收尾
 * （调用方需要在 `finally` 里结束导入状态，否则进度会一直停在界面上）。
 */
export async function importWithFailureFeedback(
  action: (options?: ImportPhotoOptions) => Promise<ImportedPhoto[]>,
  options?: ImportPhotoOptions,
): Promise<ImportedPhoto[]> {
  const failures: ImportFailure[] = [];

  try {
    return await action({
      ...options,
      onPhotoFailed: (failure) => {
        failures.push(failure);
        options?.onPhotoFailed?.(failure);
      },
    });
  } finally {
    notifyImportFailures(failures);
  }
}
