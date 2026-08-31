import { invoke } from '@tauri-apps/api/core';

export function tauriInvoke<TResult>(command: string, payload?: Record<string, unknown>) {
  return invoke<TResult>(command, payload);
}
