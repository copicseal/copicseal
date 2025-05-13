<template>
  <CoSettingsPanel v-if="currentCoPic" title="输出">
    <div class="camera-info">
      <div>宽 * 高：</div>
      <div>倍数：</div>
      <div>类型：</div>
      <div class="btn">
        <CoButton icon @click="handleAdd">
          +
        </CoButton>
      </div>
      <template v-for="(item, index) in outputs" :key="index">
        <div class="width-height">
          <input v-model="item.width" type="text">
          <div class="separator" @click="handleSwap(item)">
            *
          </div>
          <input v-model="item.height" type="text">
        </div>
        <div>
          <select v-model="item.scale">
            <option v-for="option in scaleOptions" :key="option" :value="option">
              {{ option }}x
            </option>
          </select>
        </div>
        <div>
          <select v-model="item.type">
            <option v-for="option in typeOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>
        <div class="btn">
          <CoButton v-show="outputs.length > 1" icon @click="handleDel(index)">
            <Delete />
          </CoButton>
        </div>
      </template>
    </div>
    <div class="output-path">
      <div>导出目录：（<span class="change-btn" @click="handleOutputFolder">更换</span>）</div>
      <span @click="handleOpenOutputFolder">{{ outputPath }}</span>
    </div>
    <div class="btns">
      <CoButton outline @click="handleApplyAll">
        应用全部
      </CoButton>
    </div>
  </CoSettingsPanel>
</template>

<script lang="ts" setup>
import type { Output } from '@/types';
import CoButton from '@/components/co-button/index.vue';
import { Delete } from '@/components/co-icon/index';
import CoSettingsPanel from '@/components/co-settings-panel/index.vue';
import { injectCoPic } from '@renderer/uses/co-pic';
import { storage } from '@renderer/utils/storage';
import { ref, watch } from 'vue';

const { currentCoPic, list } = injectCoPic();

const scaleOptions = ref([1, 2, 4, 6, 8]);
const typeOptions = ref(['jpeg', 'png', 'webp']);

const outputs = ref<Output[]>([]);
const outputPath = ref('');

watch(currentCoPic, (value) => {
  if (value) {
    outputs.value = value.getSettings().outputs;
    outputPath.value = value.getSettings().outputPath || '';
  }
});

function handleAdd() {
  outputs.value.push({
    scale: 1,
    width: 1920,
    height: 1080,
    type: 'jpeg',
  });
}

function handleDel(index: number) {
  outputs.value.splice(index, 1);
}

function handleSwap(item: Output) {
  const width = item.width;
  item.width = item.height;
  item.height = width;
}

async function handleOutputFolder() {
  const path = await window.api.openDirectoryDialog();
  if (!path)
    return;
  outputPath.value = path;
  storage.setItem('defaultOutputPath', path);
  currentCoPic.value.getSettings().outputPath = path;
}

function handleOpenOutputFolder() {
  window.api.openTargetPath(outputPath.value);
}

function handleApplyAll() {
  list.value.forEach((item) => {
    item.getSettings().outputs = outputs.value;
    item.getSettings().outputPath = outputPath.value;
  });
}
</script>

<style lang="scss" scoped>
.camera-info {
  display: grid;
  grid-template-columns: 2fr 40px 56px 16px;
  /* 行/列间距 */
  gap: 4px 8px;

  input,
  select {
    width: 100%;
  }

  .width-height {
    display: flex;
    input {
      flex: 1;
    }
    .separator {
      margin: 0 4px;
      cursor: pointer;
    }
  }
  .btn {
    display: flex;
    justify-content: center;
    align-items: center;
    button {
      font-size: 20px;
      opacity: 0.5;
    }
  }
}

.output-path {
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

.btns {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
