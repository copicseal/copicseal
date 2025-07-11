<template>
  <div class="setting-output">
    <el-table :data="output.presets" size="small" border empty-text="配置为空，请从主界面右侧输出面板设置">
      <el-table-column type="index" />
      <el-table-column prop="name" label="宽 x 高">
        <template #default="{ row }">
          <span v-if="row.isOriginal">原始图片</span>
          <span v-else>{{ row.width }} x {{ row.height }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" />
      <el-table-column prop="actions" label="操作">
        <template #default="{ $index }">
          <el-link underline="never" @click="handleSort($index, -1)">
            <div class="i-solar-arrow-up-broken" />
          </el-link>
          <el-link underline="never" @click="handleSort($index, 1)">
            <div class="i-solar-arrow-down-broken" />
          </el-link>
          <el-link type="danger" underline="never" @click="handleDelete($index)">
            <div class="i-solar-trash-bin-minimalistic-2-broken" />
          </el-link>
        </template>
      </el-table-column>
    </el-table>
    <div class="output-path">
      <div>导出目录：（<span class="change-btn" @click="handleOutputFolder">更换</span>）</div>
      <span @click="handleOpenOutputFolder">{{ output.defaultPath }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { AppConfig } from '@renderer/types';

const props = defineProps<{
  config: AppConfig;
}>();

const output = ref<AppConfig['output']>(props.config.output);

watch(() => props.config.output, (newOutput) => {
  output.value = newOutput;
}, { immediate: true });

function handleSort(index: number, v = -1) {
  const [item] = output.value.presets.splice(index, 1);
  output.value.presets.splice(index + v, 0, item);
}

function handleDelete(index: number) {
  output.value.presets.splice(index, 1);
}

async function handleOutputFolder() {
  const path = await window.api.openDirectoryDialog();
  if (!path)
    return;
  output.value.defaultPath = path;
}

function handleOpenOutputFolder() {
  window.api.openTargetPath(output.value.defaultPath);
}
</script>

<style lang="scss" scoped>
.setting-output {
  --el-border-color-lighter: #666;
  --el-fill-color-blank: rgba(0, 0, 0, 0);
  margin-top: 12px;

  :deep(.el-table) {
    font-size: 12px;

    .el-link {
      font-size: 20px;

      + .el-link {
        margin-left: 8px;
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
}
</style>
