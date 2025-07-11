<template>
  <el-dropdown trigger="click" size="large" :popper-options="popperOptions" popper-class="co-menu__dropdown" @command="handleMenuClick">
    <el-badge is-dot :hidden="!hasNewVersion">
      <slot />
    </el-badge>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="(opt, i) in menuOpts" :key="i" :command="opt.value">
          <span :class="opt.icon" />
          <span class="ml-2">{{ opt.label }}</span>
          <el-badge v-if="opt.hasDot" is-dot />
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  <CoCheckUpdateDialog v-model="updateDialogVisible" />
  <CoAboutDialog v-model="aboutDialogVisible" />
  <CoSettingsDialog v-model="settingsDialogVisible" />
</template>

<script lang="ts" setup>
import CoAboutDialog from '../dialogs/co-about-dialog.vue';
import CoCheckUpdateDialog from '../dialogs/co-check-update-dialog.vue';
import CoSettingsDialog from '../dialogs/co-settings-dialog.vue';

const popperOptions = {
  modifiers: [
    {
      name: 'offset',
      options: {
        offset: [0, 8],
      },
    },
  ],
};

const settingsDialogVisible = ref(false);
const aboutDialogVisible = ref(false);
const updateDialogVisible = ref(false);

const appVersion = ref({
  currentVersion: '',
  latestVersion: '',
  downloadLink: '',
});

const hasNewVersion = computed(() => {
  const { currentVersion, latestVersion } = appVersion.value;
  return currentVersion !== latestVersion;
});

async function getAppVersion() {
  appVersion.value = await window.api.getAppVersion();
}
getAppVersion();

const menuOpts = computed(() => {
  const { latestVersion } = appVersion.value;

  return [
    { label: '应用设置', icon: 'i-solar-settings-minimalistic-broken', value: 'settings' },
    { label: hasNewVersion.value ? `🎉 新版本 v${latestVersion}` : '检查更新', icon: 'i-solar-refresh-square-broken', value: 'check-update', hasDot: hasNewVersion.value },
    { label: '意见反馈', icon: 'i-solar-chat-dots-broken', value: 'feedback' },
    { label: '关于 Copicseal', icon: 'i-solar-info-square-broken', value: 'about' },
  ];
});

function handleMenuClick(command: string) {
  switch (command) {
    case 'settings':
      settingsDialogVisible.value = true;
      break;
    case 'check-update':
      updateDialogVisible.value = true;
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

<style lang="scss">
.co-menu__dropdown {
  .el-popper__arrow {
    display: none;
  }
}
</style>
