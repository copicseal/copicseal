<template>
  <el-dropdown trigger="click" size="large" @command="handleMenuClick">
    <slot />
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="(opt, i) in menuOpts" :key="i" :command="opt.value">
          <span :class="opt.icon" />
          <span class="ml-2">{{ opt.label }}</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  <CoAboutDialog v-model="aboutDialogVisible" />
  <ElDialog v-model="settingsDialogVisible" title="设置" fullscreen :close-on-click-modal="false" :close-on-press-escape="false">
    1
  </ElDialog>
</template>

<script lang="ts" setup>
import CoAboutDialog from './dialogs/co-about-dialog.vue';

const settingsDialogVisible = ref(false);
const aboutDialogVisible = ref(false);

const appVersion = ref({
  currentVersion: '',
  latestVersion: '',
  downloadLink: '',
});

async function getAppVersion() {
  appVersion.value = await window.api.getAppVersion();
}
getAppVersion();

const menuOpts = computed(() => {
  // const { currentVersion, latestVersion } = appVersion.value;

  return [
    // { label: '设置', icon: 'i-solar-settings-minimalistic-broken', value: 'settings' },
    // { label: currentVersion !== latestVersion ? `🎉 新版本 v${latestVersion}` : '检查更新', icon: 'i-solar-refresh-square-broken', value: 'check-update' },
    { label: '意见反馈', icon: 'i-solar-chat-dots-broken', value: 'feedback' },
    { label: '关于 Copicseal', icon: 'i-solar-info-square-broken', value: 'about' },
  ];
});

function handleMenuClick(command: string) {
  switch (command) {
    case 'settings':
      settingsDialogVisible.value = true;
      break;
    case 'feedback':
      window.open('https://github.com/copicseal/copicseal/issues/new', '_blank');
      break;
    case 'about':
      aboutDialogVisible.value = true;
      break;
    default:
      break;
  }
}
</script>
