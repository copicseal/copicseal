<template>
  <div class="setting-general">
    <div class="save-directory">
      <div>程序保存目录：（<span class="change-btn" @click="handleSaveDirectory">更换</span> | <span class="change-btn" @click="handleRestoreDefault">恢复默认</span>）</div>
      <span @click="handleOpenSaveDirectory">{{ saveDirectory }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { AppConfig } from '@renderer/types';

const props = defineProps<{
  config: AppConfig;
}>();

const emit = defineEmits<{
  // 当目录变更时触发
  directoryChange: [oldDir: string, newDir: string];
}>();

const saveDirectory = ref<string>(props.config.saveDirectory || '');

watch(() => props.config.saveDirectory, (newDir) => {
  saveDirectory.value = newDir || '';
}, { immediate: true });

async function handleSaveDirectory() {
  const path = await window.api.openDirectoryDialog();
  if (!path)
    return;

  const oldDir = saveDirectory.value;

  // 只有当目录确实改变时才更新
  if (oldDir !== path) {
    // 更新UI和本地配置，但不立即执行移动
    (props.config as any).saveDirectory = path;
    saveDirectory.value = path;

    // 通知父组件目录已变更
    emit('directoryChange', oldDir, path);
  }
}

async function handleRestoreDefault() {
  try {
    // 调用API获取默认目录
    const defaultDir = await window.api.manageSaveDirectory();
    const oldDir = saveDirectory.value;

    // 只有当当前目录与默认目录不同时才更新
    if (oldDir && oldDir !== defaultDir) {
      // 更新UI和本地配置，但不立即执行移动
      (props.config as any).saveDirectory = defaultDir;
      saveDirectory.value = defaultDir;

      // 通知父组件目录已变更
      emit('directoryChange', oldDir, defaultDir);
    }
  }
  catch (error) {
    console.error('Failed to get default save directory:', error);
  }
}

function handleOpenSaveDirectory() {
  if (saveDirectory.value) {
    window.api.openTargetPath(saveDirectory.value);
  }
}
</script>

<style lang="scss" scoped>
.setting-general {
  margin-top: 12px;

  .save-directory {
    margin-top: 16px;

    .change-btn {
      cursor: pointer;
      text-decoration: underline;
    }

    span {
      &:nth-child(2) {
        text-decoration: underline;
        cursor: pointer;
        color: #98c4f6;
        word-break: break-word;
      }
    }
  }
}
</style>
