import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type { ImportFailure, ImportPhotoOptions } from '@/platform/contracts';
import { importFailureReason } from '@/platform/errors';
import { translate } from '@/shared/i18n';
import { appNavigate } from '@/shared/providers/navigation-provider';
import type { ImportedPhoto } from '@/shared/types/photo';

/** 汇总提示里最多列出的文件名数量，超出的折叠成「等 N 张」。 */
const MAX_LISTED_FAILURES = 3;

/** 与 Rust 侧 `fs.rs::HEIC_DECODER_MISSING_CODE` 一致：系统解不了 HEIC 且没装插件。 */
const HEIC_DECODER_MISSING_CODE = 'heic-decoder-missing';

/** 设置页里「插件」锚点（见 settings-page 的 `ANCHOR_TABS`）。 */
const PLUGIN_SETTINGS_ANCHOR = 'plugins-section';

/** 缺解码能力时的补救入口：直接跳到「设置 → 插件」安装插件。 */
function decoderFixButton(toastId: { current?: string | number }) {
  return (
    <button
      type="button"
      className="mt-2 inline-flex w-fit items-center rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
      onClick={() => {
        appNavigate('/settings', PLUGIN_SETTINGS_ANCHOR);
        if (toastId.current !== undefined) {
          toast.dismiss(toastId.current);
        }
      }}
    >
      {translate('common.import.installPlugin')}
    </button>
  );
}

function needsDecoderFix(failures: readonly ImportFailure[]): boolean {
  return failures.some((failure) => failure.code === HEIC_DECODER_MISSING_CODE);
}

/**
 * 拼出提示里的说明内容。
 *
 * 按钮**放进说明里**而不是用 sonner 的 `action`：`action` 固定在提示右侧、垂直居中，
 * 遇到这种多行长文案会被挤成半截悬空，放下面更自然。
 */
function buildDescription(text: string, fix: ReactNode | null): ReactNode {
  if (!fix) {
    return text;
  }

  return (
    <span className="flex flex-col">
      <span>{text}</span>
      {fix}
    </span>
  );
}

/**
 * 导入失败的统一提示。
 *
 * 单张失败给一条错误提示；多张失败合并成一条汇总，避免一次拖进十几张 HEIC 时刷屏。
 * 逐张的原因已经写进控制台（见 `asset-service`），这里只负责让用户知道「哪些被跳过了」。
 * 如果失败原因是缺少 HEIC 解码能力，说明文字下面再给一个直达插件面板的按钮。
 */
export function notifyImportFailures(failures: readonly ImportFailure[]): void {
  if (failures.length === 0) {
    return;
  }

  // 缺解码能力的说明最有价值，优先展示它
  const primary =
    failures.find((failure) => failure.code === HEIC_DECODER_MISSING_CODE) ?? failures[0];
  // toast 的 id 在创建之后才知道，先用一个盒子接住，按钮点击时再读
  const toastId: { current?: string | number } = {};
  const fix = needsDecoderFix(failures) ? decoderFixButton(toastId) : null;

  if (failures.length === 1) {
    toastId.current = toast.error(
      translate('common.import.failedOne', { name: failures[0].name }),
      { description: buildDescription(failures[0].reason, fix) },
    );
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

  toastId.current = toast.warning(
    translate('common.import.failedMany', { count: failures.length }),
    { description: buildDescription(`${listed}${more} · ${primary.reason}`, fix) },
  );
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
