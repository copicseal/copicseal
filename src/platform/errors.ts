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
