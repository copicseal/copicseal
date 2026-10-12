export type { PlatformErrorCode, PlatformErrorOptions } from './contracts';

import type { PlatformErrorCode } from './contracts';

export { PlatformError } from './contracts';

export function isFallbackError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ((error as { code?: PlatformErrorCode }).code === 'PLATFORM_NOT_IMPLEMENTED' ||
      (error as { code?: PlatformErrorCode }).code === 'PLATFORM_UNSUPPORTED')
  );
}

/**
 * 把任意形态的错误归一化成可读文案。
 *
 * Tauri 命令返回 `Result<_, String>`，JS 侧拿到的是字符串；网页端或其它路径可能抛
 * `Error`，个别库还会抛带 `message` 的对象，所以三种形态都要兜住，避免提示里出现
 * `[object Object]`。
 */
export function importFailureReason(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}
