<template>
  <div class="co-menu">
    <div v-if="list.length" class="co-menu__title" :title="currentCoPic.name">
      <span class="name">{{ displayFileName }}</span>
      <span class="index">{{ currentIndex + 1 }}/{{ list.length }}</span>
    </div>
    <div class="co-menu__placeholder" />
    <div class="co-menu__btns">
      <CoPresetsDropdown v-if="list.length" />
      <CoButton v-if="list.length" outline @click="handleExport()">
        导出
      </CoButton>
      <CoButton v-if="list.length" outline @click="handleExportAll()">
        导出全部
      </CoButton>
      <CoMenuDropdown>
        <CoButton icon class="btn-settings">
          <Menu />
        </CoButton>
      </CoMenuDropdown>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Menu } from '@/components/co-icon';
import { injectCoPic } from '@renderer/uses/co-pic';
import { useExport } from '@renderer/uses/export';
import CoMenuDropdown from './dropdowns/co-menu-dropdown.vue';
import CoPresetsDropdown from './dropdowns/co-presets-dropdown.vue';

const { currentCoPic, currentIndex, list } = injectCoPic();

const MAX_NAME_LENGTH = 20;
const displayFileName = computed(() => {
  const splits = currentCoPic.value.name.split('.');
  const suffix = splits.pop() || '';
  const filename = splits.join('.');

  if (filename.length <= MAX_NAME_LENGTH) {
    return suffix ? `${filename}.${suffix}` : filename;
  }

  const middleIndex = Math.floor(MAX_NAME_LENGTH / 2);
  const front = filename.slice(0, middleIndex);
  const end = filename.slice(-middleIndex);

  return suffix ? `${front}...${end}.${suffix}` : `${front}...${end}`;
});

const { handleExport, handleExportAll } = useExport();
</script>

<style lang="scss" scoped>
.co-menu {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  background-color: #535353;

  .co-menu__title {
    display: flex;
    align-items: center;
    overflow: hidden;

    .name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .index {
      margin-left: 8px;
      padding: 0 8px;
      font-size: 14px;
      border-radius: 4px;
      color: #535353;
      background-color: rgba(255, 255, 255, 0.8);
    }
  }

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
      margin-left: 12px;
      font-size: 24px;
    }
  }
}
</style>
