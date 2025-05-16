<template>
  <div v-show="visible" class="co-progress">
    <div class="co-progress-dialog">
      <div class="header">
        导出图片
      </div>
      <div class="content">
        <ElProgress
          striped
          :percentage="(current / total) * 100 || 0"
          :stroke-width="10"
          :show-text="false"
        />
        <div v-if="current >= total" class="tips">
          已处理 {{ total }} 张
        </div>
        <div v-else class="tips">
          正在处理第 {{ current }}/{{ total }} 张 ({{ filename }})
        </div>
      </div>
      <div class="footer">
        <CoButton v-if="current >= total" outline @click="() => onFinish()">
          完成
        </CoButton>
        <CoButton v-else outline @click="() => onCancel()">
          取消
        </CoButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import CoButton from '@/components/co-button/index.vue';

defineProps<{
  current: number;
  total: number;
  filename: string;
  visible: boolean;
  onCancel: () => void;
  onFinish: () => void;
}>();
</script>

<style lang="scss" scoped>
.co-progress {
  position: fixed;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.5);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;

  .co-progress-dialog {
    border-radius: 4px;
    background-color: #535353;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

    .header {
      padding: 8px 20px;
      font-size: 16px;
      border-bottom: 1px solid #3e3e3e;
    }

    .content {
      padding: 20px 20px;

      .el-progress {
        width: 280px;
      }

      .tips {
        margin-top: 8px;
        font-size: 12px;
        color: #eee;
      }
    }

    .footer {
      padding: 0 20px 12px;
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>
