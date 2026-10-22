import type { CompressResult } from '@/platform/contracts';

/** 任务状态：比 Rust 的最终状态多出「等待 / 处理中」两个前端阶段。 */
export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped' | 'cancelled';

/** 列表里的一张图（导入时探测出来的信息 + 会话内的处理状态）。 */
export interface CompressTask {
  id: string;
  path: string;
  name: string;
  ext: string;
  /** 原始体积（字节） */
  size: number;
  /** 显示口径的尺寸（已按 EXIF 朝向转正） */
  width: number;
  height: number;
  /** 列表缩略图（Rust 生成的缓存文件，走 asset 协议显示）；还没生成时为 null */
  thumbnailPath: string | null;
  status: TaskStatus;
  /** 处理阶段（`decoding` 等），仅 `running` 时有值 */
  stage: string;
  result: CompressResult | null;
  /** 不能压缩的原因（不支持的格式 / 损坏）；非空时不会进入批次 */
  blockedReason: string | null;
}

/** 三种使用方式：快速（推荐参数）/ 自定义 / 预设（批量规则）。 */
export type CompressMode = 'quick' | 'custom' | 'presets';

/** Rust 的最终状态到前端状态的映射。 */
export function toTaskStatus(status: CompressResult['status']): TaskStatus {
  switch (status) {
    case 'ok':
      return 'done';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

/** 这张图能否进入压缩批次。 */
export function isRunnable(task: CompressTask): boolean {
  return !task.blockedReason;
}
