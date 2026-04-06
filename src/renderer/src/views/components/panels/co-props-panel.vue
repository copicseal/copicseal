<template>
  <CoSettingsPanel v-if="currentCoPic" title="参数" @undo="() => currentCoPic.resetModifiedExif()">
    <div class="camera-info">
      <div class="label">
        快速填充:
      </div>
      <div class="value">
        <!-- 设备选择区域 -->
        <div v-if="allDevices.length" class="device-selector">
          <el-dropdown trigger="click" @command="(command) => handleDeviceChange(command)">
            <span class="el-dropdown-link">
              选择设备
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="device in allDevices" :key="device.id" :command="device.id">
                  <div class="device-icon">
                    <div v-if="device.type === 'camera'" class="i-solar-camera-outline" />
                    <div v-else class="i-solar-round-graph-linear" />
                    {{ device.name }}
                  </div>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div v-else>
          暂无设备(前往设置添加)
        </div>
      </div>
      <template v-for="key in usedExifKeys" :key="key">
        <div class="label">
          {{ getExifName(key) }}:
        </div>
        <div class="value">
          <input v-model="currentCoPic.state.modifiedExif[key]" type="text">
        </div>
      </template>
    </div>

    <!-- 确认覆盖弹框 -->
    <el-dialog
      v-model="confirmDialogVisible"
      title="确认覆盖EXIF信息"
      width="400px"
    >
      <div>
        <p>确定要将选择的{{ selectedDeviceType }}设备的EXIF信息应用到当前图片吗？</p>
        <p>设备名称: {{ selectedDeviceName }}</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="confirmDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="applyDeviceExif('current')">覆盖当前</el-button>
          <el-button type="primary" @click="applyDeviceExif('all')">覆盖全部</el-button>
        </span>
      </template>
    </el-dialog>
  </CoSettingsPanel>
</template>

<script lang="ts" setup>
import { getExifName, injectCoPic } from '@/uses/co-pic';
import { useConfig } from '@renderer/uses/config';
import { computed, ref } from 'vue';

const { currentCoPic } = injectCoPic();
const { config } = useConfig();

// 获取所有设备列表
const allDevices = computed(() => {
  return config.value.userDevices ?? [];
});

// 选中的设备
const selectedCamera = ref<string>('');
const selectedLens = ref<string>('');

// 确认弹框状态
const confirmDialogVisible = ref<boolean>(false);
const selectedDeviceType = ref<string>('');
const selectedDeviceId = ref<string>('');
const selectedDeviceName = ref<string>('');

// 根据设备ID获取设备信息
function getDeviceById(id: string) {
  return config.value.userDevices?.find(device => device.id === id);
}

// 处理设备选择变化
function handleDeviceChange(deviceId: string) {
  if (!currentCoPic.value)
    return;

  const device = getDeviceById(deviceId);
  if (!device)
    return;

  // 根据设备类型更新选中的设备ID
  if (device.type === 'camera') {
    selectedCamera.value = deviceId;
  }
  else {
    selectedLens.value = deviceId;
  }

  // 显示确认弹框
  selectedDeviceType.value = device.type;
  selectedDeviceId.value = deviceId;
  selectedDeviceName.value = device.name;
  confirmDialogVisible.value = true;
}

// 应用设备的EXIF信息
function applyDeviceExif(mode: 'current' | 'all') {
  if (!currentCoPic.value || !selectedDeviceId.value)
    return;

  const device = getDeviceById(selectedDeviceId.value);
  if (device) {
    // 根据模式应用EXIF信息
    if (mode === 'current') {
      // 只覆盖当前已有的EXIF字段
      Object.entries(device.exif).forEach(([key, value]) => {
        if (currentCoPic.value?.usedExifKeys.value.includes(key)) {
          currentCoPic.value.state.modifiedExif[key] = value;
        }
      });
    }
    else {
      // 覆盖全部EXIF字段
      Object.entries(device.exif).forEach(([key, value]) => {
        currentCoPic.value.state.modifiedExif[key] = value;
      });
    }

    // 更新选中设备ID
    if (selectedDeviceType.value === 'camera') {
      selectedCamera.value = selectedDeviceId.value;
    }
    else {
      selectedLens.value = selectedDeviceId.value;
    }
  }

  // 关闭弹框
  confirmDialogVisible.value = false;
}

const usedExifKeys = computed(() => {
  return currentCoPic.value?.usedExifKeys.value ?? [];
});
</script>

<style lang="scss" scoped>
.device-selector {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;

  .el-dropdown {
    margin-right: 10px;
  }

  .el-dropdown-link {
    color: #fff;
    cursor: pointer;
    padding: 4px 12px;
    border: 1px solid #444;
    background: #222;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 80px;

    &:hover {
      background: #333;
    }
  }
}

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
    input {
      width: 100%;
    }
  }
}
</style>

<style lang="scss">
.el-dropdown-menu__item {
  .device-icon {
    display: inline-flex !important;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
}
</style>
