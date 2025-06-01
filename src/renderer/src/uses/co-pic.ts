import type { InjectionKey, Ref } from 'vue';
import type { Settings } from '../types';
import type { CoPic } from '../utils/co-pic';
import { cloneDeep } from 'lodash';
import { computed, inject, provide, ref, shallowRef } from 'vue';
import { storage } from '../utils/storage';

const CoPicInjectionKey: InjectionKey<ReturnType<typeof getCoPicList>>
  = Symbol('CoPicInjectionKey');

export function provideCoPic() {
  const coPicList = getCoPicList();
  coPicList.setSettings(getDefaultSettings());
  provide(CoPicInjectionKey, coPicList);

  return coPicList;
}
export function injectCoPic() {
  return inject(CoPicInjectionKey, getCoPicList());
}

function getCoPicList() {
  const settings: Ref<Settings> = ref<Settings>(getDefaultSettings());
  const list = shallowRef<CoPic[]>([]);
  const currentIndex = ref(0);

  const currentCoPic = computed(() => list.value[currentIndex.value]);
  function setCurrentIndex(index: number) {
    currentIndex.value = index;
  }

  function setSettings(_settings: Settings) {
    settings.value = _settings;
    list.value.forEach(item => item.setSettings(cloneDeep(_settings)));
  }

  function push(pic: CoPic) {
    pic.setSettings(getDefaultSettings());
    pic.state.settings = getDefaultSettings();
    list.value = list.value.concat(pic);
    currentIndex.value = list.value.length - 1;
  }

  function remove(indexes: number[]) {
    list.value = list.value.filter((_, index) => !indexes.includes(index));
    currentIndex.value = Math.max(0, currentIndex.value - indexes.length);
  }

  return {
    list,
    currentIndex,
    currentCoPic,
    setCurrentIndex,
    settings,
    setSettings,
    push,
    remove,
  };
}

function getDefaultSettings(): Settings {
  return {
    background: {
      mode: 'image',
      color: { rgba: '#ffffff' },
      image: {
        filters: [
          {
            type: 'blur',
            value: '0.4rem',
          },
          {
            type: 'brightness',
            value: '100%',
          },
        ],
      },
      style: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      padding: [0.2, 0.2],
    },
    outputs: [
      {
        scale: 1,
        width: 1920,
        height: 1080,
        type: 'jpeg',
        isOriginal: true,
      },
    ],
    outputPath: storage.getItem('defaultOutputPath') || '',
  };
}

export const primaryExif = [
  { name: '相机厂商', key: 'Make' },
  { name: '相机型号', key: 'Model' },
  { name: '软件', key: 'Software' },
  { name: '拍摄日期', key: 'DateTimeOriginal' },
  { name: '镜头型号', key: 'LensModel' },
  { name: '焦距', key: 'FocalLength' },
  { name: '光圈', key: 'FNumber' },
  { name: '快门', key: 'ExposureTime' },
  { name: '曝光补偿', key: 'ExposureBiasValue' },
  { name: '曝光模式', key: 'ExposureMode' },
  { name: '白平衡', key: 'WhiteBalance' },
  { name: '测光模式', key: 'MeteringMode' },
  { name: '感光度', key: 'ISOSpeedRatings' },
];

export function getExifName(key: string) {
  return primaryExif.find(item => item.key === key)?.name || key;
}
