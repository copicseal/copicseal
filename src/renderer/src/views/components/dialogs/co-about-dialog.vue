<template>
  <el-dialog
    v-model="visible" width="400px" :before-close="handleClose" class="about-dialog"
    title="关于 Copicseal"
  >
    <div class="content">
      <!-- Logo -->
      <div class="logo">
        <img src="@/assets/logo.svg" alt="Copicseal Logo">
      </div>

      <!-- 版本 -->
      <div v-if="appVersion.latestVersion !== appVersion.currentVersion" class="version">
        🎉 新版本：v{{ appVersion.currentVersion }} {{ '->' }} <a :href="appVersion.downloadLink" target="_blank">v{{ appVersion.latestVersion }}</a>
      </div>
      <div v-else class="version">
        版本：v{{ appVersion.currentVersion }}
      </div>

      <!-- 简介 -->
      <div class="description">
        Copicseal 是一个图片加边框水印工具，支持读取 EXIF 信息，用户可自定义水印样式和位置，快速为照片添加快门、ISO 等相机参数。
      </div>

      <div class="social-icons">
        <el-tooltip content="柯灰" placement="top">
          <a href="https://github.com/kohaiy" target="_blank">
            <img class="icon" src="@/assets/avatar.jpg" alt="avatar">
          </a>
        </el-tooltip>
        <el-tooltip content="开源地址" placement="top">
          <a href="https://github.com/copicseal/copicseal" target="_blank">
            <img class="icon" src="@/assets/github.svg" alt="GitHub">
          </a>
        </el-tooltip>
        <el-tooltip content="B 站主页" placement="top">
          <a href="https://space.bilibili.com/24731556" target="_blank">
            <img class="icon" src="@/assets/bilibili.svg" alt="Bilibili">
          </a>
        </el-tooltip>
        <el-popover title="QQ交流群" width="200">
          <img style="width: 100%;" :src="`https://copicseal-s0.kohai.top/assets/images/qq_group_qrcode.jpg?t=${t}`" alt="QQ交流群">
          <template #reference>
            <a href="https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=2oA3p4PkON0BqPOQ8YmDfEEEFs3O-Qec&authKey=y7Wh6li8APK%2Bk5s3dkXTrdA%2FSZM1Q8eSIIE%2BlmEXd62YCjdfdQJOhNjnKIWo2%2BSH&noverify=0&group_code=1038047655" target="_blank">
              <img class="icon" src="@/assets/qq.svg" alt="QQ">
            </a>
          </template>
        </el-popover>
        <el-popover title="微信交流群" width="200">
          <img style="width: 100%;" :src="`https://copicseal-s0.kohai.top/assets/images/wechat_group_qrcode.jpg?t=${t}`" alt="微信交流群">
          <template #reference>
            <a href="#">
              <img class="icon" src="@/assets/wechat.svg" alt="微信">
            </a>
          </template>
        </el-popover>
      </div>

      <!-- 免责声明 -->
      <div class="disclaimer">
        ⚠️ 本工具所使用的相机/手机品牌商标版权归各自公司所有，仅用于展示 EXIF 信息，不构成商业关联或侵权。
        如果您发现侵犯您的合法权益，请通过意见反馈联系我们进行删除。
      </div>
    </div>

    <template #footer>
      <CoButton outline @click="visible = false">
        关闭
      </CoButton>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
const t = Date.now();

const appVersion = ref({
  currentVersion: '',
  latestVersion: '',
  downloadLink: '',
});

async function getAppVersion() {
  appVersion.value = await window.api.getAppVersion();
}
getAppVersion();

const visible = defineModel({ default: false });
const open = () => (visible.value = true);
const handleClose = () => (visible.value = false);

defineExpose({ open });
</script>

<style lang="scss" scoped>
.about-dialog {
  background-color: #1d1e1f;

  .el-dialog__body {
    padding-top: 12px;
    background-color: #1d1e1f;
    color: #e0e0e0;
  }

  .el-dialog__footer {
    background-color: #1d1e1f;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .logo {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;

      img {
        height: 56px;
      }
    }

    .version {
      font-size: 14px;
      text-align: center;
      color: #b0b0b0;
      a {
        color: #b0b0b0;
        text-decoration: underline;
      }
    }

    .description {
      font-size: 15px;
      line-height: 1.6;
      color: #d0d0d0;
    }

    .disclaimer {
      font-size: 12px;
      color: #888;
      line-height: 1.5;
      background: #2a2a2a;
      padding: 8px;
      border-radius: 6px;
    }

    .social-icons {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 12px;

      .icon {
        width: 36px;
        height: 36px;
        padding: 4px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid #444;
        transition:
          transform 0.2s ease,
          opacity 0.2s ease;
        cursor: pointer;
        background-color: #fff;

        &:hover {
          transform: scale(1.1);
          opacity: 0.9;
        }
      }
    }
  }
}
</style>
