/**
 * Copicseal 远程模板 SDK —— 运行时垫片。
 *
 * 这个文件会被**打包进模板包**，因此它不能带任何依赖（尤其不能带 React：
 * 模板里的 hooks 必须用宿主那一份 React，否则会命中 "Invalid hook call"）。
 *
 * 工作方式：
 *   1. 宿主 `import()` 打包好的模板包；
 *   2. 宿主调用包的默认导出 `createTemplate(sdk)`；
 *   3. 该入口先调用这里的 `__bindSdk(sdk)`，再返回作者的模板定义。
 *
 * `jsx` / `jsxs` / `formatExifText` / `useImageAspect` 等都是**转发函数**：
 * 调用发生在渲染期，那时一定已经注入完成，因此不存在「模块求值时运行时还没到」的时序问题。
 */

/** 宿主注入的运行时；由 `__bindSdk` 写入。 */
let boundRuntime = null;

/**
 * 绑定宿主运行时。必须由打包入口在返回模板定义之前调用。
 * @param {object} sdk 宿主注入的 SDK 对象
 */
export function __bindSdk(sdk) {
  if (!sdk) {
    throw new Error('[template-sdk] __bindSdk 收到了空运行时');
  }
  boundRuntime = sdk;
  // Fragment 用 live binding 暴露：JSX 的 <>…</> 在渲染期直接引用这个变量
  Fragment = sdk.Fragment;
}

/**
 * 取当前运行时。
 *
 * 优先用 `__bindSdk` 注入的那份；兜底读宿主写在全局上的同名对象，
 * 这样手写（不经过打包入口）的模板包也能工作。
 */
function runtime() {
  const value = boundRuntime ?? globalThis.__CO_TEMPLATE_SDK__;
  if (!value) {
    throw new Error(
      '[template-sdk] 宿主运行时尚未注入：请通过模板包的默认导出 createTemplate(sdk) 加载',
    );
  }
  return value;
}

// —— JSX 运行时 ——
export const jsx = (...args) => runtime().jsx(...args);
export const jsxs = (...args) => runtime().jsxs(...args);
/** 由 `__bindSdk` 赋值的 live binding；JSX 的 Fragment 会被编译成对它的引用。 */
export let Fragment;

// —— 宿主工具透传（保持与宿主同一份实现）——
export const formatExifText = (...args) => runtime().formatExifText(...args);
export const useImageAspect = (...args) => runtime().useImageAspect(...args);
export const getBrandLogoSvg = (...args) => runtime().getBrandLogoSvg(...args);
export const getBrandLogoUrl = (...args) => runtime().getBrandLogoUrl(...args);
export const normalizeBrand = (...args) => runtime().normalizeBrand(...args);
export const normalizeModelName = (...args) => runtime().normalizeModelName(...args);

/** React 命名空间（需要 useMemo / Fragment 等时可直接用）。 */
export const React = new Proxy(
  {},
  {
    get: (_target, key) => runtime().React[key],
  },
);

/**
 * 模板文案里支持的 EXIF 变量。
 *
 * 与宿主 `format-exif-text.ts` 的清单一致；只是给作者做提示与校验用，
 * 真正的替换始终发生在宿主的 `formatExifText` 里。
 */
export const EXIF_TEXT_VARIABLES = [
  { token: '{Make}', label: '相机品牌' },
  { token: '{Model}', label: '相机型号' },
  { token: '{LensModel}', label: '镜头型号' },
  { token: '{FocalLength}', label: '焦距' },
  { token: '{FNumber}', label: '光圈' },
  { token: '{ExposureTime}', label: '快门' },
  { token: '{ISO}', label: '感光度' },
  { token: '{DateTaken}', label: '拍摄时间' },
];

/**
 * 定义模板。
 *
 * 这是纯数据组包，不依赖宿主状态，所以自带一份实现：作者的
 * `export default defineTemplate({...})` 会在模块求值期执行，那时运行时还没注入。
 *
 * @param {object} input `{ meta, fields, backgroundDefaults?, fontDefaults?, component }`
 */
export function defineTemplate(input) {
  const { meta, fields, backgroundDefaults, fontDefaults, component } = input;

  return {
    meta,
    schema: { fields },
    backgroundDefaults,
    fontDefaults,
    // 与宿主一样在渲染期直接调用组件（hooks 归属调用方组件，契约与内置模板一致）
    render: (props) => runtime().jsx(component, props),
  };
}
