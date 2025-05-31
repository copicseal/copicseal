<template>
  <CoSettingsPanel v-if="currentCoPic" title="模板">
    <div class="camera-info">
      <div class="label">
        全局字体:
      </div>
      <div class="value font-input">
        <select v-model="currentCoPic.state.fontFamily" @change="handleFontChange">
          <option v-for="(item, index) in fonts" :key="index" :value="item.value">
            {{ item.name }}
          </option>
        </select>
        <CoButton icon title="刷新字体列表" @click="loadFonts">
          <div class="i-solar-refresh-broken" />
        </CoButton>
      </div>
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
        <div v-show="!item.hidden" class="label" :title="item.__co.description">
          {{ item.__co.label }}:
        </div>
        <div v-show="!item.hidden" class="value">
          <div v-if="item.__co.enums">
            <CoRadioGroup v-model="currentCoPic.state.templateProps[item.key]" :options="item.__co.enums" />
          </div>
          <CoPos9Input v-else-if="item.__co.type === 'pos9'" v-model="currentCoPic.state.templateProps[item.key]" />
          <CoShadowInput v-else-if="item.__co.type === 'shadow'" v-model="currentCoPic.state.templateProps[item.key]" />
          <CoColorInput v-else-if="item.__co.type === 'color'" v-model="currentCoPic.state.templateProps[item.key]" />
          <CoInput v-else-if="item.type === Number || item.__co.type === Number" v-model="currentCoPic.state.templateProps[item.key]" mode="percent" :min="item.__co.min ?? 0" :max="item.__co.max ?? undefined" />
          <!-- <input v-else-if="item.type === Boolean" v-model="currentCoPic.state.templateProps[item.key]" type="checkbox"> -->
          <el-switch
            v-else-if="item.type === Boolean" v-model="currentCoPic.state.templateProps[item.key]"
            size="small"
          />
          <input v-else v-model="currentCoPic.state.templateProps[item.key]" type="text">
        </div>
      </template>
    </div>
  </CoSettingsPanel>
</template>

<script lang="ts" setup>
import { injectCoPic } from '@renderer/uses/co-pic';

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
        let hidden = false;
        if (prop.__co.when) {
          const { templateProps } = currentCoPic.value.state;
          if (typeof prop.__co.when === 'function' && !prop.__co.when(templateProps)) {
            hidden = true;
          }
          else if (typeof prop.__co.when === 'string' && !templateProps[prop.__co.when]) {
            hidden = true;
          }
        }

        return [{
          key,
          hidden,
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

const fonts = ref<{ name: string; value: string }[]>([]);
async function loadFonts() {
  const list = await window.api.getSysFonts();
  fonts.value = list.map(item => ({ name: item, value: item }));
}
loadFonts();

function handleFontChange() {
  localStorage.setItem('fontFamily', currentCoPic.value.state.fontFamily);
}
</script>

<style lang="scss" scoped>
.camera-info {
  display: grid;
  /* 关键代码：第一列宽度自适应内容，第二列自动填充 */
  grid-template-columns: max-content 1fr;
  /* 行/列间距 */
  gap: 8px 12px;

  .label {
    color: #ccc;
    text-align: right;
  }

  .value {
    overflow: auto;

    input[type=text], select {
      width: 100%;
    }
  }

}
.font-input {
  display: flex;
  align-items: center;

  .co-button {
    margin-left: 4px;
    font-size: 16px;
  }
}
</style>
