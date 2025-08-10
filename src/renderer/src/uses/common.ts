export const appVersion = ref({
  currentVersion: '',
  latestVersion: '',
  downloadLink: '',
  changelog: '',
});

export async function getAppVersion() {
  appVersion.value = await window.api.getAppVersion();
}
getAppVersion();
