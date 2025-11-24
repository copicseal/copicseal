<template>
  <CoMark />
</template>

<script setup lang="ts">
import { provideCoPic } from './uses/co-pic';
import CoMark from './views/co-mark.vue';
import 'element-plus/theme-chalk/el-scrollbar.css';

provideCoPic();
</script>

<style lang="scss" scoped></style>

<style lang="scss">
body {
  margin: 0;
  padding: 0;
  color: #eee;
  font-size: initial;
  user-select: none;

  .el-scrollbar {
    --el-scrollbar-bg-color: white;
    --el-scrollbar-hover-bg-color: white;
  }
}
* {
  box-sizing: border-box;
}

input,
select {
  line-height: 20px;
  color: #eee;
  background-color: #3e3e3e;
  border: 1px solid #666;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #999;
  }

  &:disabled {
    background-color: #555;
    cursor: not-allowed;
  }
}

select {
  height: 24px;
}
</style>
