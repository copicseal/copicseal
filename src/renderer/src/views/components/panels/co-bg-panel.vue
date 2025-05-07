<template>
  <CoSettingsPanel v-if="settings" title="背景">
    <div>
      <CoRadioGroup v-model="settings.mode" :options="modeOptions" />
    </div>
    <div class="camera-info">
      <template v-if="settings.mode === 'color' && settings.color">
        <div class="label">
          颜色选择:
        </div>
        <div class="value">
          <input v-model="settings.color.rgba" type="color">
        </div>
        <p v-if="false">
          调色盘:
          <span
            v-for="it in currentCoPic.colorPalette"
            :key="it.join()"
            class="color-palette"
            :style="`--color: rgb(${it.join()})`"
            @click="
              settings.color.rgba
                = `#${it.map((it) => it.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
            "
          />
        </p>
      </template>
      <template v-if="settings.mode === 'image' && settings.image">
        <template v-for="it in settings.image.filters" :key="it.type">
          <div class="label">
            {{ filterMap[it.type] || it.type }}:
          </div>
          <div class="value">
            <CoInput v-model="it.value" mode="percent" :min="0" />
          </div>
        </template>
      <!-- <p>背景模糊: <input v-model="settings.image.blur" type="text" /></p>
      <p>背景亮度: <input v-model="settings.image.brightness" type="text" /></p> -->
      </template>
      <template v-if="settings.mode !== 'none' && settings.padding">
        <div class="label">
          垂直内边距:
        </div>
        <div class="value">
          <CoInput v-model="settings.padding[0]" mode="percent" :min="0" />
        </div>
        <div class="label">
          水平内边距:
        </div>
        <div class="value">
          <CoInput v-model="settings.padding[1]" mode="percent" :min="0" />
        </div>
      </template>
    </div>
    <div class="btns">
      <CoButton outline @click="handleApplyAll">
        应用全部
      </CoButton>
    </div>
  </CoSettingsPanel>
</template>

<script lang="ts" setup>
import type { Option } from '@/components/co-radio-group/index.vue';
import type { Settings } from '@/types';
import CoButton from '@/components/co-button/index.vue';
import { DisabledByDefault, Image, Palette } from '@/components/co-icon';
import CoInput from '@/components/co-input/index.vue';
import CoRadioGroup from '@/components/co-radio-group/index.vue';
import CoSettingsPanel from '@/components/co-settings-panel/index.vue';
import { injectCoPic } from '@renderer/uses/co-pic';
import { cloneDeep } from 'lodash';
import { ref, watch } from 'vue';

const { currentCoPic, list } = injectCoPic();

const settings = ref<Settings['background']>();

let isPicChange = false;
watch(
  currentCoPic,
  () => {
    if (currentCoPic.value) {
      isPicChange = true;
      settings.value = cloneDeep(currentCoPic.value.state.settings.background);
    }
    else {
      settings.value = undefined;
    }
  },
  { immediate: true },
);

watch(
  () => currentCoPic.value?.state.settings.background.color,
  (val) => {
    if (val && settings.value)
      settings.value.color = val;
  },
);

watch(
  settings,
  () => {
    if (isPicChange || !settings.value) {
      isPicChange = false;
      return;
    }
    Object.assign(currentCoPic.value.state.settings.background, settings.value);
    // currentCoPic.value.setSettings({
    //   background: settings.value,
    // });
  },
  { deep: true },
);

function handleApplyAll() {
  list.value.forEach((item) => {
    if (settings.value) {
      item.state.settings.background = cloneDeep(settings.value);
    }
  });
}

const modeOptions = ref<Option[]>([
  { label: '无背景', icon: DisabledByDefault, value: 'none' },
  { label: '纯色背景', icon: Palette, value: 'color' },
  { label: '图片背景', icon: Image, value: 'image' },
]);

const filterMap = {
  blur: '高斯模糊',
  brightness: '亮度',
};
</script>

<style lang="scss" scoped>
.color-palette {
  display: inline-block;
  width: 40px;
  height: 20px;
  background-color: var(--color);
  border: 1px solid #eee;
  cursor: pointer;

  + .color-palette {
    margin-left: 4px;
  }
}

.camera-info {
  display: grid;
  /* 关键代码：第一列宽度自适应内容，第二列自动填充 */
  grid-template-columns: max-content 1fr;
  /* 行/列间距 */
  gap: 8px 16px;
  margin-top: 12px;

  .label {
    color: #ccc;
    text-align: right;
    line-height: 26px;
  }

  .value {
    input {
      width: 100%;
    }
  }
}

.btns {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
