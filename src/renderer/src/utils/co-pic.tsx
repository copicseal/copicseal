import type { Settings } from '@/types';
import type { Tags } from './exif';
import TplDefault from '@/views/tpls/tpl-default.vue';
import { computed, reactive, ref, shallowRef } from 'vue';
import { getExif } from './exif';

export class CoPic {
  id = Math.random();
  name = Math.random().toString();
  imgUrl!: string;
  private file!: File;
  colorPalette: number[][] = [];
  private settings!: Settings;

  private initPromise: Promise<void[]> | null = null;

  private exif = ref<Tags>();
  modifiedExif = ref<Tags>({});
  outputExif = computed(() => ({ ...this.state.exif, ...this.modifiedExif.value }));
  isLoaded = ref(false);

  state = reactive<{
    settings: Settings;
    exif: Tags;
    modifiedExif: Tags;
    isLoaded: boolean;
    templateProps: Record<string, any>;
    fontFamily: string;
  }>({
    settings: {
      background: { mode: 'none' },
      outputs: [],
      outputPath: '',
    },
    exif: {},
    modifiedExif: {},
    isLoaded: false,
    templateProps: {},
    fontFamily: localStorage.getItem('fontFamily') || 'Arial',
  });

  template = shallowRef(TplDefault);

  constructor(file: File) {
    this.file = file;
    this.imgUrl = URL.createObjectURL(file);
    this.name = file.name;
    this.init();
  }

  setSettings(settings: Partial<Settings>) {
    // const fillId = (fields: SettingsField[]): SettingsField[] => {
    //   return fields.map((field) => {
    //     return {
    //       ...field,
    //       children: field.children ? fillId(field.children) : undefined
    //     };
    //   });
    // };

    this.settings = {
      ...this.settings,
      ...settings,
    };
    // this.settings.fields = fillId(this.settings.fields ?? []);
    this.isLoaded.value = false;
    this.state.isLoaded = false;
    this.asyncLoad();
  }

  getSettings() {
    return this.state.settings;
  }

  getExif() {
    return this.outputExif.value || {};
  }

  usedExifKeys = ref<string[]>([]);

  addExifKey(key: string) {
    if (['ImageWidth', 'ImageHeight'].includes(key))
      return;
    if (!this.usedExifKeys.value.includes(key)) {
      this.usedExifKeys.value.push(key);
      this.state.modifiedExif[key] = this.state.exif[key] || '';
    }
  }

  resetModifiedExif() {
    this.usedExifKeys.value.forEach((key) => {
      this.state.modifiedExif[key] = this.state.exif[key] || '';
    });
  }

  private async init() {
    this.initPromise = Promise.all([this.loadExif(), this.getColorPalette()]);
    return this.initPromise;
  }

  private async asyncLoad() {
    await this.initPromise;
    // await Promise.all([this.genBgImg()])
    console.warn('isLoaded');

    this.isLoaded.value = true;
    this.state.isLoaded = true;
  }

  private async loadExif() {
    if (!this.exif.value) {
      this.exif.value = await getExif(this.file);
      this.state.exif = this.exif.value;
      this.state.settings.outputs = this.state.settings.outputs.map((output) => {
        if (output.isOriginal) {
          const { ImageWidth, ImageHeight } = this.state.exif;
          return {
            ...output,
            width: +(ImageWidth || output.width),
            height: +(ImageHeight || output.height),
          };
        }
        return output;
      });
    }
    console.log(this.exif.value);

    // return this.exif
  }

  protected async getColorPalette() {
    // if (this.colorPalette.length) return
    // const img = await fetchImage(this.imgUrl)
    // if (img) {
    //   const colorThief = new ColorThief()
    //   const res = await colorThief.getPalette(img, 3)
    //   this.colorPalette = res || [[255, 255, 255]]
    //   this.settings.bg.color =
    //     `#${this.colorPalette[0].map((it) => it.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
    // }
    console.warn('getColorPalette');
  }
}
