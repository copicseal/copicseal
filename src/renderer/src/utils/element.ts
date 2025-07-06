import type { ElMessageBoxOptions, MessageOptions } from 'element-plus';

export async function coPrompt(message: string, options?: ElMessageBoxOptions) {
  return ElMessageBox.prompt(message, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    customClass: 'co-prompt',
    ...options,
  })
    .then(({ value }) => value)
    .catch(() => '');
}

export async function coConfirm(message: string, options?: ElMessageBoxOptions) {
  return ElMessageBox.confirm(message, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    customClass: 'co-confirm',
    ...options,
  })
    .then(() => true)
    .catch(() => false);
}

export function coMessage(message: string, options?: MessageOptions) {
  return ElMessage({
    message,
    ...options,
  });
}
