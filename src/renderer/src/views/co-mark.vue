<template>
  <div class="co-mark">
    <CoMenu />
    <div class="co-mark-main">
      <CoMain />
      <CoSide />
    </div>
    <CoProgress v-bind="progress" />
  </div>
</template>

<script lang="ts" setup>
import CoProgress from '@/components/co-progress/index.vue';
import { provideProgress } from '@renderer/uses/progress';
import CoMain from './components/co-main.vue';
import CoMenu from './components/co-menu.vue';
import CoSide from './components/co-side.vue';

const progress = provideProgress();
</script>

<style lang="scss" scoped>
.co-mark {
  width: 100%;
  height: 100vh;

  .co-menu {
    height: 40px;
  }

  .co-mark-main {
    display: flex;
    height: calc(100% - 40px);

    .co-main {
      flex: 1;
    }

    .co-side {
      width: 30%;
      min-width: 180px;
      max-width: 280px;
    }
  }
}
</style>
