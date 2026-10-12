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

/** 后端错误串里的机器可读标记，形如 `[[co:heic-decoder-missing]] 文案`。 */
const ERROR_CODE_PATTERN = /^\[\[co:([a-z0-9-]+)\]\]\s*/;

export interface ParsedFailureReason {
  /** 机器可读的错误码；没有标记时为 null */
  code: string | null;
  /** 给用户看的文案（已剥掉标记） */
  message: string;
}

/**
 * 拆开后端错误串里的错误码与展示文案。
 *
 * 后端（Rust）有些错误需要前端配合做后续动作（例如「系统解不了 HEIC 且没装插件」要引导到
 * 插件面板），这类错误串会带 `[[co:code]]` 前缀；没带标记的就是普通文案。
 */
export function parseFailureReason(error: unknown): ParsedFailureReason {
  const raw = importFailureReason(error);
  const match = raw.match(ERROR_CODE_PATTERN);

  if (!match) {
    return { code: null, message: raw };
  }

  return { code: match[1] ?? null, message: raw.slice(match[0].length) };
}
