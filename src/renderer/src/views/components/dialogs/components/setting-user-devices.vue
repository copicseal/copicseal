<template>
  <div class="setting-user-devices">
    <div class="setting-header">
      <div>用户设备管理</div>
      <el-button type="primary" size="small" @click="handleAddDevice">
        添加设备
      </el-button>
    </div>

    <el-table v-if="userDevices.length" :data="userDevices" size="small" border style="margin-top: 16px;">
      <el-table-column type="index" label="序号" width="60" />
      <el-table-column prop="name" label="设备名称" />
      <el-table-column prop="type" label="设备类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.type === 'camera' ? 'primary' : 'success'">
            {{ row.type === 'camera' ? '相机' : '镜头' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="exif" label="EXIF信息" width="400">
        <template #default="{ row }">
          <div class="exif-info">
            <div v-for="(value, key) in row.exif" :key="key" class="exif-item">
              <span class="exif-key">{{ key }}:</span>
              <span class="exif-value">{{ value }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row, $index }">
          <el-button size="small" type="primary" link @click="handleEditDevice(row, $index)">
            编辑
          </el-button>
          <el-button size="small" type="danger" link @click="handleDeleteDevice($index)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else description="暂无设备" style="margin-top: 32px;" />

    <!-- 添加/编辑设备对话框 -->
    <el-dialog
      v-model="deviceDialogVisible"
      :title="isEditing ? '编辑设备' : '添加设备'"
      width="500px"
      destroy-on-close
    >
      <el-form :model="formData" label-width="80px">
        <el-form-item label="设备名称" required>
          <el-input v-model="formData.name" placeholder="请输入设备名称" />
        </el-form-item>

        <el-form-item label="设备类型">
          <el-radio-group v-model="formData.type">
            <el-radio label="camera">
              相机
            </el-radio>
            <el-radio label="lens">
              镜头
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="EXIF信息">
          <div class="exif-fields">
            <!-- 已添加的EXIF字段 -->
            <div v-if="exifFields.length" class="added-exif-fields">
              <div v-for="(field, index) in exifFields" :key="index" class="exif-field-item">
                <el-select
                  v-model="field.key"
                  placeholder="选择EXIF键名"
                  style="width: 150px; margin-right: 8px;"
                  size="small"
                  filterable
                  allow-create
                  :filter-method="handleFilterExifField"
                >
                  <!-- 显示所有可能的EXIF字段（包括已选的） -->
                  <el-option
                    v-for="exifField in availableExifFields"
                    :key="exifField.value"
                    :label="exifField.label"
                    :value="exifField.value"
                  />
                </el-select>
                <el-input
                  v-model="field.value"
                  placeholder="EXIF值"
                  style="flex: 1; margin-right: 8px;"
                  size="small"
                />
                <el-button
                  type="danger"
                  size="small"
                  @click="exifFields.splice(index, 1)"
                >
                  -
                </el-button>
              </div>
            </div>

            <!-- 添加EXIF字段按钮 -->
            <div style="margin-top: 10px;">
              <el-button
                type="primary"
                size="small"
                @click="exifFields.push({ key: '', value: '' })"
              >
                + 添加EXIF字段
              </el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="deviceDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" @click="handleSubmitDevice">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { AppConfig, UserDevice } from '@renderer/types';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  config: AppConfig;
}>();

// 常见的EXIF字段列表，按设备类型分类
const commonExifFields = [
  // 相机和镜头通用
  { label: 'Make (制造商)', value: 'Make', type: ['camera', 'lens'] },
  { label: 'Model (型号)', value: 'Model', type: ['camera', 'lens'] },

  // 相机专用
  { label: 'ISOSpeedRatings (ISO)', value: 'ISOSpeedRatings', type: ['camera'] },
  { label: 'ExposureTime (曝光时间)', value: 'ExposureTime', type: ['camera'] },
  { label: 'FNumber (光圈)', value: 'FNumber', type: ['camera'] },
  { label: 'Manufacturer (制造商)', value: 'Manufacturer', type: ['camera'] },
  { label: 'CameraModelName (相机型号)', value: 'CameraModelName', type: ['camera'] },

  // 镜头专用
  { label: 'LensMake (镜头制造商)', value: 'LensMake', type: ['lens'] },
  { label: 'LensModel (镜头型号)', value: 'LensModel', type: ['lens'] },
  { label: 'FocalLength (焦距)', value: 'FocalLength', type: ['lens'] },
];

// 相机专用EXIF字段
const cameraExifFields = computed(() => commonExifFields.filter(field => field.type.includes('camera')));

// 镜头专用EXIF字段
const lensExifFields = computed(() => commonExifFields.filter(field => field.type.includes('lens')));

// 设备列表
const userDevices = ref<UserDevice[]>(props.config.userDevices || []);

// 对话框状态
const deviceDialogVisible = ref(false);
const isEditing = ref(false);
const editingIndex = ref<number>(-1);

// 表单数据
const formData = ref({
  id: '',
  name: '',
  type: 'camera' as 'camera' | 'lens',
  exif: {} as Record<string, string>,
});

// 根据设备类型显示所有可能的EXIF字段
const availableExifFields = computed(() => {
  const deviceType = formData.value.type;

  if (deviceType === 'camera') {
    return cameraExifFields.value;
  }
  else {
    return lensExifFields.value;
  }
});

// EXIF字段列表
const exifFields = ref<{ key: string; value: string }[]>([]);

// 选中的EXIF字段
const selectedExifField = ref<string>('');

// EXIF字段搜索过滤
function handleFilterExifField(query: string, option: any) {
  return option.label.toLowerCase().includes(query.toLowerCase())
    || option.value.toLowerCase().includes(query.toLowerCase());
}

// 监听配置变化
watch(() => props.config.userDevices, (newDevices) => {
  userDevices.value = newDevices || [];
}, { deep: true, immediate: true });

// 监听设备类型变化，更新EXIF字段
watch(() => formData.value.type, () => {
  // 清空已选的EXIF字段，因为类型改变后，有些字段可能不再适用
  exifFields.value = [];
  selectedExifField.value = '';
});

// 添加设备
function handleAddDevice() {
  isEditing.value = false;
  editingIndex.value = -1;
  formData.value = {
    id: `device-${Date.now()}`,
    name: '',
    type: 'camera',
    exif: {},
  };
  exifFields.value = [{ key: '', value: '' }];
  deviceDialogVisible.value = true;
}

// 编辑设备
function handleEditDevice(row: UserDevice, index: number) {
  isEditing.value = true;
  editingIndex.value = index;
  formData.value = { ...row };

  // 转换EXIF对象为字段列表
  exifFields.value = Object.entries(row.exif).map(([key, value]) => ({
    key,
    value,
  }));

  // 如果没有EXIF字段，添加一个空字段
  if (exifFields.value.length === 0) {
    exifFields.value.push({ key: '', value: '' });
  }

  deviceDialogVisible.value = true;
}

// 删除设备
function handleDeleteDevice(index: number) {
  userDevices.value.splice(index, 1);
  updateConfig();
}

// 提交设备
async function handleSubmitDevice() {
  // 验证表单
  if (!formData.value.name.trim()) {
    return;
  }

  // 转换EXIF字段为对象
  const exif = exifFields.value
    .filter(field => field.key.trim() && field.value.trim())
    .reduce((obj, field) => {
      obj[field.key.trim()] = field.value.trim();
      return obj;
    }, {} as Record<string, string>);

  formData.value.exif = exif;

  if (isEditing.value) {
    // 编辑现有设备
    userDevices.value[editingIndex.value] = { ...formData.value };
  }
  else {
    // 添加新设备
    userDevices.value.push({ ...formData.value });
  }

  // 更新配置
  updateConfig();
  deviceDialogVisible.value = false;
}

// 更新配置
function updateConfig() {
  (props.config as any).userDevices = [...userDevices.value];
}
</script>

<style lang="scss" scoped>
.setting-user-devices {
  --el-border-color-lighter: #666;
  --el-fill-color-blank: rgba(0, 0, 0, 0);

  .setting-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
  }

  .exif-info {
    max-height: 120px;
    overflow-y: auto;
  }

  .exif-item {
    margin-bottom: 4px;
    font-size: 12px;
  }

  .exif-key {
    font-weight: bold;
    margin-right: 8px;
  }

  .exif-fields {
    .common-exif-selector,
    .no-available-fields {
      margin-bottom: 16px;
      display: flex;
      align-items: center;
    }

    .added-exif-fields {
      margin-top: 16px;
    }

    .exif-field-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
  }
}
</style>
