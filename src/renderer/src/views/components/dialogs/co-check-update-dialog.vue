<template>
  <el-dialog
    v-model="visible"
    title="检查更新"
    width="400px"
    class="update-dialog"
  >
    <div v-if="isLoaded" class="content">
      <!-- 更新标题 -->
      <div v-if="appVersion.latestVersion !== appVersion.currentVersion" class="title">
        🎉 新版本：v{{ appVersion.currentVersion }} {{ '->' }} v{{ appVersion.latestVersion }}
      </div>
      <div v-else class="title">
        🎉 已是最新版本：v{{ appVersion.currentVersion }}
      </div>

      <!-- 更新内容 -->
      <el-scrollbar class="mt-2 changelog" max-height="200px">
        <div v-html="changelog" />
      </el-scrollbar>
    </div>
    <div v-else class="content">
      <div class="loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>获取信息中...
      </div>
    </div>

    <template #footer>
      <div v-if="appVersion.latestVersion !== appVersion.currentVersion" class="footer-buttons">
        <CoButton outline @click="handleClose">
          稍后再说
        </CoButton>
        <CoButton outline type="primary" @click="gotoDownload">
          前往下载
        </CoButton>
      </div>
      <div v-else class="footer-buttons">
        <CoButton outline @click="handleClose">
          关闭
        </CoButton>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { Loading } from '@element-plus/icons-vue';
import { appVersion, getAppVersion } from '@renderer/uses/common';
import { marked } from 'marked';

const renderer = new marked.Renderer();

renderer.link = function ({ href, text }) {
  if (/\/pull\/\d+$/.test(text)) {
    text = text.replace(/^.*\/pull\/(\d+)$/, '#$1');
  }

  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

const visible = defineModel({ default: false });

const isLoaded = computed(() => !!appVersion.value.currentVersion);

const changelog = computed(() => {
  return marked(appVersion.value.changelog, { renderer });
});

watch(visible, (newVal) => {
  if (newVal) {
    getAppVersion();
  }
});

const handleClose = () => (visible.value = false);

function gotoDownload() {
  window.open(appVersion.value.downloadLink, '_blank');
  visible.value = false;
}
</script>

  <style lang="scss" scoped>
  .update-dialog {
  background-color: #1d1e1f;

  .el-dialog__body {
    padding-top: 12px;
    background-color: #1d1e1f;
    color: #e0e0e0;
  }

  .el-dialog__footer {
    background-color: #1d1e1f;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .title {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
    }

    .version-info {
      font-size: 14px;
      color: #bbb;
      line-height: 1.5;
      text-align: center;

      span {
        color: #fff;
        font-weight: 500;
      }
    }

    :deep(.changelog) {
      background: #2a2a2a;
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      color: #ccc;

      a {
        color: #ccc;
      }
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      font-size: 16px;
      color: #ccc;

      .el-icon {
        margin-right: 8px;
        color: #ccc;
      }
    }
  }

  .footer-buttons {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
