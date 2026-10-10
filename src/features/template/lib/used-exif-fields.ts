import type { ExifData } from '@/platform';
import { EXIF_TEXT_VARIABLES, type ExifOverrideField } from '../templates/format-exif-text';

const KNOWN_FIELDS = new Set<string>(EXIF_TEXT_VARIABLES.map((variable) => variable.field));

/**
 * 每个模板「渲染时读过」的 EXIF 字段。
 *
 * 与旧版 `usedExifKeys` 的语义一致：模板渲染时读到哪个字段就登记哪个，只增不减。
 * 之所以用 Proxy 而不是让模板声明或扫文案，是因为模板可能**结构性地**读 EXIF
 * （例如品牌 logo 取 `exif.make` / `exif.model`），也可能解构后再用，
 * 只有在真正 `get` 的那一刻才知道答案。
 */
const usedByTemplate = new Map<string, Set<ExifOverrideField>>();
const listeners = new Set<() => void>();
const snapshots = new Map<string, { version: number; fields: ExifOverrideField[] }>();
let version = 0;
let notifyScheduled = false;

function scheduleNotify() {
  // 记录发生在子组件渲染期间，不能同步通知订阅者（会在渲染中 setState），推到微任务
  if (notifyScheduled) {
    return;
  }

  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    for (const listener of listeners) {
      listener();
    }
  });
}

export function subscribeUsedExifFields(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function fieldsOf(templateId: string): ExifOverrideField[] {
  return usedByTemplate.get(templateId)
    ? [...(usedByTemplate.get(templateId) as Set<ExifOverrideField>)]
    : [];
}

/** 订阅用快照：同一版本内保持同一引用，避免 useSyncExternalStore 反复重渲染。 */
export function getUsedExifFieldsSnapshot(templateId: string): ExifOverrideField[] {
  const cached = snapshots.get(templateId);
  if (cached && cached.version === version) {
    return cached.fields;
  }

  const fields = fieldsOf(templateId);
  snapshots.set(templateId, { version, fields });
  return fields;
}

/**
 * 给模板渲染用的 exif 包一层代理：谁被 `get` 了就把字段登记到该模板名下。
 *
 * 两点约束：
 * - 只记录已知的可改写字段；`Symbol`（React 内部探测）与未知键放过；
 * - **枚举期间不记录**：`{...exif}` / `Object.values(exif)` 会先 `ownKeys` 再逐个 `get`，
 *   把这类读取也算进来的话，任何做过一次展开的模板都会把全部字段列出来。
 */
export function trackExifReads(exif: ExifData | null, templateId: string): ExifData | null {
  if (!exif || !templateId) {
    return exif;
  }

  let enumerating = false;

  const record = (key: string) => {
    let used = usedByTemplate.get(templateId);
    if (!used) {
      used = new Set<ExifOverrideField>();
      usedByTemplate.set(templateId, used);
    }

    if (!used.has(key as ExifOverrideField)) {
      used.add(key as ExifOverrideField);
      version += 1;
      scheduleNotify();
    }
  };

  return new Proxy(exif, {
    ownKeys(target) {
      enumerating = true;
      queueMicrotask(() => {
        enumerating = false;
      });
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      enumerating = true;
      queueMicrotask(() => {
        enumerating = false;
      });
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get(target, key, receiver) {
      if (!enumerating && typeof key === 'string' && KNOWN_FIELDS.has(key)) {
        record(key);
      }

      return Reflect.get(target, key, receiver);
    },
  });
}
