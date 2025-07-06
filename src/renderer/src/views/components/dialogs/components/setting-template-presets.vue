<template>
  <div class="setting-template-presets">
    <el-table :data="templatePresets" size="small" border row-key="id" empty-text="配置为空，请从主界面顶部模板配置添加">
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="preset-desc">
            {{ row.description }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称">
        <template #default="{ row }">
          <el-input v-if="row._isEditing" v-model="row.name" :maxlength="20" @blur="row._isEditing = undefined" />
          <span v-else>{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="templateName" label="模板名称" />
      <el-table-column prop="actions" label="操作">
        <template #default="{ row, $index }">
          <el-link underline="never" @click="handleSort($index, -1)">
            <div class="i-solar-arrow-up-broken" />
          </el-link>
          <el-link underline="never" @click="handleSort($index, 1)">
            <div class="i-solar-arrow-down-broken" />
          </el-link>
          <el-link underline="never" @click="row._isEditing = true">
            <div class="i-solar-pen-new-square-broken" />
          </el-link>
          <el-link type="danger" underline="never" @click="handleDelete($index)">
            <div class="i-solar-trash-bin-minimalistic-2-broken" />
          </el-link>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script lang="ts" setup>
import type { AppConfig, TemplatePreset } from '@renderer/types';

const props = defineProps<{
  config: AppConfig;
}>();

const templatePresets = ref<TemplatePreset[]>([]);

watch(() => props.config.templatePresets, (newPresets) => {
  templatePresets.value = newPresets;
}, { immediate: true });

function handleSort(index: number, v = -1) {
  const [item] = templatePresets.value.splice(index, 1);
  templatePresets.value.splice(index + v, 0, item);
}

function handleDelete(index: number) {
  templatePresets.value.splice(index, 1);
}
</script>

<style lang="scss" scoped>
.setting-template-presets {
  --el-border-color-lighter: #666;
  --el-fill-color-blank: rgba(0, 0, 0, 0);
  margin-top: 12px;

  :deep(.el-table) {
    font-size: 12px;

    .preset-desc {
      padding: 4px 20px;
      white-space: pre-wrap;
    }

    .sort-icon {
      font-size: 20px;
      cursor: move;
    }

    .el-link {
      font-size: 20px;

      + .el-link {
        margin-left: 8px;
      }
    }
  }
}
</style>
