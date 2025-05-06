import { inject, provide, ref } from 'vue';

const ProgressInjectionKey = Symbol('ProgressInjectionKey');
export function provideProgress() {
  const progress = ref({
    current: 0,
    total: 0,
    filename: '',
    visible: false,
    onCancel: () => {
      progress.value.visible = false;
    },
    onFinish: () => {
      progress.value.visible = false;
    },
  });
  provide(ProgressInjectionKey, progress);

  return progress;
}

export function injectProgress() {
  return inject(
    ProgressInjectionKey,
    ref({
      current: 0,
      total: 0,
      filename: '',
      visible: false,
      onCancel: () => {},
      onFinish: () => {},
    }),
  );
}
