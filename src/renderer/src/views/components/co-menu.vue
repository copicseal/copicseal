<template>
  <div class="co-menu">
    <div v-if="list.length">
      {{ currentCoPic.name }}({{ currentIndex + 1 }}/{{ list.length }})
    </div>
    <div class="co-menu__placeholder" />
    <div v-if="appVersion.latestVersion !== appVersion.currentVersion" class="co-menu__version">
      🎉 新版本 <a :href="appVersion.downloadLink" target="_blank">v{{ appVersion.latestVersion }}</a>
    </div>
    <div v-if="list.length" class="co-menu__btns">
      <CoButton outline @click="handleExport()">
        导出
      </CoButton>
      <CoButton outline @click="handleExportAll()">
        导出全部
      </CoButton>
      <!-- <CoButton icon class="btn-settings" @click="settingsDialogVisible = true">
        <Settings />
      </CoButton> -->
    </div>
    <ElDialog v-model="settingsDialogVisible" title="设置">
      1
    </ElDialog>
  </div>
</template>

<script lang="ts" setup>
import CoButton from '@/components/co-button/index.vue';
// import { Settings } from '@/components/co-icon';
import { injectCoPic, injectProgress } from '@/uses';
import { ElDialog } from 'element-plus';
import { nextTick, ref } from 'vue';

const { currentCoPic, currentIndex, list } = injectCoPic();

const progress = injectProgress();

const settingsDialogVisible = ref(false);

const appVersion = ref({
  currentVersion: '',
  latestVersion: '',
  downloadLink: '',
});

async function getAppVersion() {
  appVersion.value = await window.api.getAppVersion();
}
getAppVersion();

async function exportToImage() {
  const filename = currentCoPic.value.name;
  const { outputs, background, outputPath } = currentCoPic.value.getSettings();
  if (!outputPath) {
    // eslint-disable-next-line no-alert
    return alert('请先设置导出目录');
  }
  const renderEl = document.querySelector('.co-render')!;
  const bgEl = document.querySelector<HTMLDivElement>('.background')!;
  const bgStyle = Object.assign({}, bgEl.style);
  Object.assign(bgEl.style, {
    width: '',
    height: '',
    minWidth: '',
    minHeight: '',
  });
  const tplEl = renderEl.querySelector<HTMLDivElement>('[data-co-tpl]')!;
  const style = tplEl
    ? Array.from(document.querySelectorAll('style')).find(style =>
      style.textContent?.includes(`[${tplEl.dataset.coTpl}]`),
    )
    || document.querySelector('link[rel=stylesheet]')
    : document.querySelector('style#co-style');

  const { width, height } = renderEl.getBoundingClientRect()!;
  const fontSize = document.querySelector('html')!.style.fontSize;
  await new Promise(r => setTimeout(r, 20));
  console.time('capture');
  const html = `
    <style>html{ font-size: ${fontSize}; }</style>
    <style>body{margin: 0; padding: 0; background-color: black; font-family: "Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","微软雅黑",Arial,sans-serif; overflow: hidden; } * { box-sizing: border-box;  }</style>
    ${style?.outerHTML || ''}
    ${renderEl.outerHTML || ''}
  `;
  Object.assign(bgEl.style, {
    width: bgStyle.width,
    height: bgStyle.height,
    minWidth: bgStyle.minWidth,
    minHeight: bgStyle.minHeight,
  });
  const res = await window.api.captureDOM({
    html,
    output: [
      ...outputs.map((output) => {
        output = { ...output };
        let fs = Number.parseFloat(fontSize);
        const outputRatio = output.width / output.height;
        const containerRatio = width / height;
        if (outputRatio > containerRatio) {
          fs = (output.height / height) * fs;
        }
        else {
          fs = (output.width / width) * fs;
        }
        if (background.mode === 'none') {
          if (outputRatio > containerRatio) {
            output.width = Math.floor(output.height * containerRatio);
          }
          else {
            output.height = Math.floor(output.width / containerRatio);
          }
        }
        return {
          ...output,
          rem: fs,
          path: `${outputPath}/${filename}@${output.scale}x.${output.type}`,
        };
      }),
    ],
  });
  console.timeEnd('capture');
  console.log(res);
}
async function handleExport() {
  progress.value.visible = true;
  progress.value.current = 0;
  progress.value.total = 1;
  progress.value.filename = currentCoPic.value.name;
  console.log(progress.value);
  await exportToImage();
  progress.value.current = 1;
}

async function handleExportAll() {
  console.time('exportAll');
  progress.value.visible = true;
  await list.value.reduce(async (p, _pic, index) => {
    await p;
    if (!progress.value.visible)
      return;
    currentIndex.value = index;
    progress.value.current = index;
    progress.value.total = list.value.length;
    progress.value.filename = currentCoPic.value.name;
    await new Promise(r => setTimeout(r, 300));
    await nextTick();
    await exportToImage();
    progress.value.current += 1;
  }, Promise.resolve());
  console.timeEnd('exportAll');
}
</script>

<style lang="scss" scoped>
.co-menu {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  background-color: #535353;

  .co-menu__placeholder {
    flex: 1;
  }

  .co-menu__version {
    font-size: 14px;

    a {
      font-size: 12px;
      color: #fff;
    }
  }

  .co-menu__btns {
    display: flex;
    align-items: center;
    margin-left: 24px;

    .btn-settings {
      font-size: 24px;
    }
  }
}
</style>
