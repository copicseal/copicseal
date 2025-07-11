<template>
  <CoSettingsPanel v-if="currentCoPic" title="输出">
    <div class="camera-info">
      <div>宽 * 高：</div>
      <!-- <div>倍数：</div> -->
      <div>类型：</div>
      <div class="btn">
        <el-dropdown trigger="click" size="small" :popper-options="popperOptions" @command="handleAdd">
          <CoButton icon>
            +
          </CoButton>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="(opt, i) in outputOpts" :key="i" :command="i">
                {{ opt.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <template v-for="(item, index) in outputs" :key="index">
        <div class="width-height">
          <input v-model="item.width" type="text" :disabled="item.isOriginal">
          <div class="separator" @click="handleSwap(item)">
            ⇋
          </div>
          <input v-model="item.height" type="text" :disabled="item.isOriginal">
        </div>
        <!-- <div>
          <select v-model="item.scale">
            <option v-for="option in scaleOptions" :key="option" :value="option">
              {{ option }}x
            </option>
          </select>
        </div> -->
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
      <CoButton outline type="info" @click="handleSaveAsDefault">
        存为默认
      </CoButton>
      <CoButton outline @click="handleApplyAll">
        应用全部
      </CoButton>
    </div>
  </CoSettingsPanel>
</template>

<script lang="ts" setup>
import type { Output } from '@/types';
import { Delete } from '@/components/co-icon/index';
import { injectCoPic } from '@/uses/co-pic';
import { useConfig } from '@renderer/uses/config';
import { coMessage } from '@renderer/utils/element';
import { cloneDeep } from 'lodash-es';

const popperOptions = {
  modifiers: [
    {
      name: 'offset',
      options: {
        offset: [0, 4],
      },
    },
  ],
};

const { config } = useConfig();
const { currentCoPic, list } = injectCoPic();

// const scaleOptions = ref([1, 2, 4, 6, 8]);
const typeOptions = ref(['jpeg', 'png', 'webp']);

const outputs = ref<Output[]>([]);
const outputPath = ref('');

watch(() => currentCoPic.value?.state.settings, (settings) => {
  if (settings) {
    outputs.value = settings.outputs;
    outputPath.value = settings.outputPath || '';
  }
}, { deep: true });

const outputOpts = [
  { value: { width: 1920, height: 1080 }, label: '原始图片', isOriginal: true },
  { value: { width: 1920, height: 1080 }, label: '1080P' },
  { value: { width: 2560, height: 1440 }, label: '2K' },
  { value: { width: 1440, height: 2560 }, label: '2K（竖屏）' },
  { value: { width: 3840, height: 2160 }, label: '4K' },
  { value: { width: 2160, height: 3840 }, label: '4K（竖屏）' },
  { value: { width: 1080, height: 1080 }, label: '方图（1080）' },
  { value: { width: 2048, height: 2048 }, label: '方图（2048）' },

  { value: { width: 4524, height: 2262 }, label: '微信朋友圈（2:1）' },
  { value: { width: 1280, height: 1706 }, label: '小红书（1280）' },
];

function handleAdd(cmd: number) {
  const opt = outputOpts[cmd];
  if (opt.isOriginal) {
    const { ImageWidth, ImageHeight } = currentCoPic.value.state.exif;
    outputs.value.push({
      scale: 1,
      type: 'jpeg',
      ...opt.value,
      width: +(ImageWidth || opt.value.width),
      height: +(ImageHeight || opt.value.height),
      isOriginal: true,
    });
  }
  else {
    outputs.value.push({
      scale: 1,
      type: 'jpeg',
      ...opt.value,
    });
  }
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
  config.value.output.defaultPath = path;
  currentCoPic.value.getSettings().outputPath = path;
}

function handleOpenOutputFolder() {
  window.api.openTargetPath(outputPath.value);
}

function handleApplyAll() {
  list.value.forEach((item) => {
    item.getSettings().outputs = outputs.value.map((opt) => {
      if (opt.isOriginal) {
        const { ImageWidth, ImageHeight } = item.state.exif;
        return {
          ...opt,
          width: +(ImageWidth || opt.width),
          height: +(ImageHeight || opt.height),
        };
      }
      return opt;
    });
    item.getSettings().outputPath = outputPath.value;
  });
}

function handleSaveAsDefault() {
  config.value.output = cloneDeep({
    defaultPath: outputPath.value,
    presets: outputs.value,
  });
  coMessage('保存成功', {
    type: 'success',
  });
}
</script>

<style lang="scss" scoped>
.camera-info {
  display: grid;
  grid-template-columns: 2fr 56px 16px;
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
