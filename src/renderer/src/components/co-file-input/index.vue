<template>
  <div class="co-file-input" :class="{ mini }">
    <label class="co-file-input__inner" @dragover.prevent @drop.prevent="handleDrop">
      <IconImage class="icon" />
      <div class="title">拖动图像</div>
      <div class="desc">
        或从您的电脑中<span class="link">选择一项或多项<input
          type="file"
          accept=".heic,.heif,image/*"
          multiple
          @change="handleChange"
        ></span>并开始使用。
      </div>
    </label>
  </div>
</template>

<script lang="ts" setup>
import IconImage from './components/icon-image.vue';

defineProps<{
  mini?: boolean;
}>();

const emit = defineEmits<{
  (event: 'change', files: File[]): void;
}>();

function handleDrop(e: DragEvent) {
  if (e.dataTransfer?.files.length)
    emit('change', Array.from(e.dataTransfer.files));
}

function handleChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files?.length)
    emit('change', Array.from(target.files));
  target.value = '';
}
</script>

<style lang="scss" scoped>
.co-file-input {
  padding: 12px;

  .co-file-input__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    border: 1px dashed #333;
    border-radius: 8px;
    cursor: pointer;

    .icon {
      font-size: 100px;
    }

    .title {
      font-size: 20px;
      font-weight: bold;
    }

    .desc {
      .link {
        color: #609aee;
        cursor: pointer;

        &:hover {
          text-decoration: underline;
        }

        input {
          display: none;
        }
      }
    }
  }

  &.mini {
    padding: 4px;

    .co-file-input__inner {
      width: 200px;
      height: 100%;
      color: #eee;
      border: 1px dashed #eee;

      .title,
      .desc {
        display: none;
      }
    }
  }
}
</style>
