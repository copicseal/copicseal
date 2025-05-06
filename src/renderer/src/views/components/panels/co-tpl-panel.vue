<template>
  <CoSettingsPanel v-if="currentCoPic" title="模板">
    <div class="camera-info">
      <div class="label">
        模板:
      </div>
      <div class="value">
        <select v-model="tpl" @change="handleTplChange">
          <option v-for="(item, index) in tpls" :key="index" :value="item.value">
            {{ item.name }}
          </option>
        </select>
      </div>
      <template v-for="(item) in tplProps" :key="item.key">
        <div class="label">
          {{ item.__co.label }}:
        </div>
        <div class="value">
          <div v-if="item.__co.enums">
            <CoRadioGroup v-model="currentCoPic.state.templateProps[item.key]" :options="item.__co.enums" />
          </div>
          <CoInput v-else-if="item.type === Number" v-model="currentCoPic.state.templateProps[item.key]" mode="percent" />
          <input v-else-if="item.type === Boolean" v-model="currentCoPic.state.templateProps[item.key]" type="checkbox">
          <input v-else v-model="currentCoPic.state.templateProps[item.key]" type="text">
        </div>
      </template>
    </div>
  </CoSettingsPanel>
</template>

<script lang="ts" setup>
import CoInput from '@/components/co-input/index.vue';
import CoRadioGroup from '@/components/co-radio-group/index.vue';
import CoSettingsPanel from '@/components/co-settings-panel/index.vue';
import { injectCoPic } from '@renderer/uses/co-pic';
import { computed, ref, watch } from 'vue';

const comps = import.meta.glob('@/views/tpls/*.vue', { eager: true, import: 'default' });

const { currentCoPic } = injectCoPic();

const tpls = computed(() => {
  return Object.values(comps).map((item: any) => ({
    name: item.title || item.name || item.__name,
    value: item.id,
    component: item,
  }));
});

const tpl = ref('');

const tplProps = computed(() => {
  if (currentCoPic.value?.template.value) {
    const tpl = currentCoPic.value.template.value;
    const props = Object.keys(tpl.props).flatMap((key) => {
      const prop = tpl.props[key];
      if (prop.__co) {
        return [{
          key,
          ...prop,
        }];
      }
      return [];
    });
    console.log(props);
    return props;
  }

  return [];
});

watch(() => currentCoPic.value, (val) => {
  if (!val) {
    return;
  }
  if (val.template.value) {
    tpl.value = val.template.value.id;
    currentCoPic.value.state.templateProps = tplProps.value.reduce((acc, cur) => {
      acc = {
        [cur.key]: cur.default,
        ...acc,
      };
      return acc;
    }, currentCoPic.value.state.templateProps);
  }
  else {
    handleTplChange();
  }
}, { immediate: true });

function handleTplChange() {
  currentCoPic.value.template.value = tpls.value.find(item => item.value === tpl.value)?.component ?? tpls.value[0].component;
  currentCoPic.value.state.templateProps = tplProps.value.reduce((acc, cur) => {
    acc[cur.key] = cur.default;
    return acc;
  }, {});
}
</script>

<style lang="scss" scoped>
.camera-info {
  display: grid;
  /* 关键代码：第一列宽度自适应内容，第二列自动填充 */
  grid-template-columns: max-content 1fr;
  /* 行/列间距 */
  gap: 8px 16px;

  .label {
    color: #ccc;
    text-align: right;
  }

  .value {
    input[type=text], select {
      width: 100%;
    }
  }
}
</style>
