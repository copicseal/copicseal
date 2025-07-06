<template>
  <ElDialog
    v-model="modelValue"
    modal-class="co-settings-dialog"
    title="应用设置"
    fullscreen
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <el-tabs tab-position="left" type="card">
      <el-tab-pane label="模板预设">
        <el-scrollbar>
          <div>模板预设</div>
          <SettingTemplatePresets :config="localConfig" />
        </el-scrollbar>
      </el-tab-pane>
      <!-- <el-tab-pane label="输出设置">
        输出预设
      </el-tab-pane>
      <el-tab-pane label="模板">
        模板
      </el-tab-pane>
      <el-tab-pane label="字体">
        字体
      </el-tab-pane> -->
    </el-tabs>
    <template #footer>
      <CoButton type="primary" outline @click="handleSave">
        确定
      </CoButton>
      <CoButton outline @click="modelValue = false">
        取消
      </CoButton>
    </template>
  </ElDialog>
</template>

<script lang="ts" setup>
import { useConfig } from '@renderer/uses/config';
import { cloneDeep } from 'lodash-es';
import SettingTemplatePresets from './components/setting-template-presets.vue';

const modelValue = defineModel({ default: false });

const { config } = useConfig();

const localConfig = ref(cloneDeep(config.value));

watch(config, () => {
  localConfig.value = cloneDeep(config.value);
});

watch(modelValue, (val) => {
  if (val) {
    localConfig.value = cloneDeep(config.value);
  }
});

function handleSave() {
  config.value = cloneDeep(localConfig.value);
  modelValue.value = false;
}
</script>

<style lang="scss">
.co-settings-dialog {
  .el-dialog {
    display: flex;
    flex-direction: column;
  }
  .el-dialog__body {
    flex: 1;
    overflow: auto;

    .el-tabs {
      height: 100%;

      .el-tabs__header {
        border: 1px solid #424242;

        .el-tabs__nav-wrap {
          margin-right: 0;
        }

        .el-tabs__nav {
          border: none;

          .el-tabs__item {
            justify-content: flex-start;
            min-width: 100px;
            height: 20px;
            padding: 0 4px;
            font-weight: normal;
            font-size: 12px;
            border: none;

            &:hover,
            &.is-active {
              color: #fff;
              background-color: #6b6b6b;
            }
          }
        }
      }

      .el-tabs__content {
        .el-tab-pane {
          height: 100%;
        }
      }
    }
  }
}
</style>
