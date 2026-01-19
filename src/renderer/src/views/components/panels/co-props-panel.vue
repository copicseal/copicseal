<template>
  <CoSettingsPanel v-if="currentCoPic" title="参数" @undo="() => currentCoPic.resetModifiedExif()">
    <!-- 设备选择区域 -->
    <div class="device-selector">
      <el-dropdown trigger="click" @command="(command) => handleDeviceChange('camera', command)">
        <span class="el-dropdown-link">
          相机
          <i class="el-icon-arrow-down el-icon--right" />
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="camera in cameras" :key="camera.id" :command="camera.id">
              {{ camera.name }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-dropdown trigger="click" @command="(command) => handleDeviceChange('lens', command)">
        <span class="el-dropdown-link">
          镜头
          <i class="el-icon-arrow-down el-icon--right" />
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="lens in lenses" :key="lens.id" :command="lens.id">
              {{ lens.name }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="camera-info">
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

// 获取相机和镜头列表
const cameras = computed(() => {
  return config.value.userDevices?.filter(device => device.type === 'camera') ?? [];
});

const lenses = computed(() => {
  return config.value.userDevices?.filter(device => device.type === 'lens') ?? [];
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
function handleDeviceChange(type: 'camera' | 'lens', deviceId: string) {
  if (!currentCoPic.value)
    return;

  // 更新选中的设备ID
  if (type === 'camera') {
    selectedCamera.value = deviceId;
  }
  else {
    selectedLens.value = deviceId;
  }

  // 如果选择了设备，显示确认弹框
  if (deviceId) {
    const device = getDeviceById(deviceId);
    if (device) {
      selectedDeviceType.value = type;
      selectedDeviceId.value = deviceId;
      selectedDeviceName.value = device.name;
      confirmDialogVisible.value = true;
    }
  }
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
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #333;
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
