<template>
  <el-dropdown
    trigger="click"
    :popper-options="popperOptions"
    popper-class="co-presets__dropdown"
    max-height="50vh"
    @command="handleMenuClick"
  >
    <CoButton outline class="co-presets__button mr-2">
      模板配置
      <span class="i-solar-alt-arrow-down-broken" />
    </CoButton>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="(opt, i) in menuOpts" :key="i" :command="opt.value">
          <div v-if="opt.value === 'saveAs'" class="dropdown-item dropdown-item--save-as">
            <span class="i-solar-add-square-broken" />
            <span class="ml-2">{{ opt.label }}</span>
          </div>
          <div v-else class="dropdown-item">
            <span class="i-solar-bookmark-broken" />
            <span class="ml-2">{{ opt.label }}</span>
          </div>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  <el-dialog
    v-model="actionDialogVisible"
    title="选择一个操作"
    class="co-presets-action__dialog"
    width="400px"
    align-center
  >
    <div v-if="selectedPresets">
      <div>当前配置：{{ selectedPresets.name }}</div>
      <!-- <el-scrollbar class="mt-2 presets-description" max-height="200px">
        <div>模板名称: {{ selectedPresets.templateName }}</div>{{ selectedPresets.description }}
      </el-scrollbar> -->
      <div class="mt-2">
        <div>【覆盖配置】：将最新修改覆盖当前配置</div>
        <div>【应用全部】：应用当前配置到所有图片</div>
        <div>【应用配置】：应用当前配置到当前图片</div>
      </div>
    </div>
    <template #footer>
      <CoButton outline type="danger" @click="handleDeletePresets">
        删除
      </CoButton>
      <CoButton outline @click="handleOverwritePresets">
        覆盖配置
      </CoButton>
      <CoButton outline @click="handleApplyPresets(true)">
        应用全部
      </CoButton>
      <CoButton type="primary" outline @click="handleApplyPresets()">
        应用配置
      </CoButton>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { injectCoPic } from '@renderer/uses/co-pic';
import { useConfig } from '@renderer/uses/config';
import { coConfirm, coMessage, coPrompt } from '@renderer/utils/element';
import { cloneDeep } from 'lodash-es';

const { config } = useConfig();
const { currentCoPic, list } = injectCoPic();

const actionDialogVisible = ref(false);

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

const menuOpts = computed(() => {
  return [
    { value: 'saveAs', label: '存为新配置' },
  ].concat(config.value.templatePresets.map(preset => ({
    value: preset.id,
    label: preset.name,
  })));
});

const selectedPresetsId = ref<string>();
const selectedPresets = computed(() => {
  return config.value.templatePresets.find(p => p.id === selectedPresetsId.value);
});
function handleMenuClick(command: string) {
  switch (command) {
    case 'saveAs':
      handleSaveAs();
      break;
    default:
      selectedPresetsId.value = command;
      actionDialogVisible.value = true;
      break;
  }
}

async function handleApplyPresets(isApplyAll = false) {
  const preset = selectedPresets.value;
  if (!preset) {
    coMessage('模板配置不存在', {
      type: 'error',
    });
    return;
  }
  if (isApplyAll) {
    list.value.forEach((pic) => {
      const { templateId, templateProps, background, fontFamily } = cloneDeep(preset);
      pic.state.templateId = templateId;
      pic.state.templateProps = templateProps!;
      pic.state.settings.background = background!;
      pic.state.fontFamily = fontFamily!;
    });
    coMessage('已应用配置到所有图片', { type: 'success' });
  }
  else {
    const { templateId, templateProps, background, fontFamily } = cloneDeep(preset);
    currentCoPic.value.state.templateId = templateId;
    currentCoPic.value.state.templateProps = templateProps!;
    currentCoPic.value.state.settings.background = background!;
    currentCoPic.value.state.fontFamily = fontFamily!;
    coMessage('已应用配置到当前图片', { type: 'success' });
  }
  actionDialogVisible.value = false;
  selectedPresetsId.value = '';
}

async function handleOverwritePresets() {
  const preset = selectedPresets.value;
  if (!preset) {
    coMessage('模板配置不存在', {
      type: 'error',
    });
    return;
  }
  Object.assign(preset, cloneDeep({
    ...getCurrentPresetsSetting(),
  }));
  coMessage('已覆盖当前配置', { type: 'success' });
  actionDialogVisible.value = false;
}

async function handleDeletePresets() {
  const preset = selectedPresets.value;
  if (!preset) {
    coMessage('模板配置不存在', {
      type: 'error',
    });
    return;
  }
  const confirm = await coConfirm(`确定删除配置模板 "${preset.name}" 吗？`, {
    title: '删除配置模板',
    type: 'warning',
  });
  console.log(confirm);

  if (confirm) {
    config.value.templatePresets = config.value.templatePresets.filter(p => p.id !== preset.id);
    coMessage('已删除配置模板', { type: 'success' });
    actionDialogVisible.value = false;
    selectedPresetsId.value = '';
  }
}

async function handleSaveAs() {
  if (config.value.templatePresets.length >= 10) {
    return void coMessage('配置模板数量已达上限（10），请先删除一些配置模板', {
      type: 'warning',
    });
  }
  const presetsName = await coPrompt('请输入新配置模板名称', {
    title: '存为新配置',
    inputPattern: /^.{2,10}$/,
    inputErrorMessage: '请输入 2 - 10 个字符',
  });
  if (!presetsName) {
    return;
  }
  config.value.templatePresets.unshift(cloneDeep({
    id: Date.now().toString(),
    name: presetsName,
    ...getCurrentPresetsSetting(),
  }));
}

function getCurrentPresetsSetting() {
  const template = currentCoPic.value.template.value!;
  const { templateId, templateProps, settings: { background }, fontFamily } = currentCoPic.value.state;

  return {
    templateId,
    templateName: template.title || '',
    templateProps,
    background,
    fontFamily,
    description: `模板参数:
${
  Object.keys(template.props)
    .filter(key => template.props[key].__co)
    .map(key => `- ${template.props[key].__co.label}: ${templateProps[key] ?? template.props[key].default}`)
    .join('\n')
}
背景:
- 模式: ${background.mode === 'image' ? '图片' : background.mode === 'color' ? '颜色' : '无'}${
  background.mode === 'color'
    ? `
- 颜色: ${background.color}`
    : ''
}${
  background.mode === 'image'
    ? `
- 滤镜: ${background.image?.filters?.map(f => `${f.type}: ${f.value}`)}`
    : ''
}${
  background.mode !== 'none'
    ? `
- 内边距: ${background.padding}`
    : ''
}`,
  };
}
</script>

<style lang="scss">
.co-presets__dropdown {
  .el-popper__arrow {
    display: none;
  }

  .dropdown-item {
    display: flex;
    align-items: center;

    &.dropdown-item--save-as {
      color: #95cafe;
    }
  }
}

.co-presets-action__dialog {
  .presets-description {
    border-radius: 6px;

    .el-scrollbar__view {
      white-space: pre-wrap;
      font-size: 12px;
      color: #888;
      line-height: 1.5;
      background: #2a2a2a;
      padding: 8px;
    }
  }
}
</style>

<style lang="scss" scoped>
.co-presets__button {
  display: flex;
  align-items: center;
  background-color: #3e3e3e;

  span {
    margin-left: 4px;
  }
}
</style>
