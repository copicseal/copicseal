<script lang="tsx">
import type { Tags } from '@/utils/exif';
import type {
  CSSProperties,
  PropType,
} from 'vue';
import type { Settings } from '../../types';
import { injectCoPic } from '@renderer/uses/co-pic';
import { mapStyle } from '@renderer/utils/common';
import { renderUtils } from '@renderer/utils/render';
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

export default defineComponent({
  props: {
    tpl: {
      type: Object as PropType<any>,
      required: true,
    },
    tplProps: {
      type: Object as PropType<any>,
      required: true,
    },
    imgUrl: {
      type: String,
      required: true,
    },
    settings: {
      type: Object as PropType<Settings>,
      required: true,
    },
    exif: {
      type: Object as PropType<Tags>,
      required: true,
    },
  },
  setup(props) {
    const isHorizontal = ref(true);
    const sizeRatio = ref(0);
    const bgStyle = computed<CSSProperties>(() => {
      const { mode, style, padding } = props.settings.background;

      return {
        position: 'relative',
        zIndex: 0,
        padding: mode === 'none' ? 0 : (padding ?? []).map((i: number) => `${i}rem`).join(' '),
        overflow: 'hidden',
        ...mapStyle(style),
      };
    });

    const bgImgStyle = computed<CSSProperties>(() => {
      const { mode, style, image, color } = props.settings.background;

      if (mode === 'none') {
        return {};
      }

      const blur
        = Number.parseFloat(String(image?.filters?.find(it => it.type === 'blur')?.value || 0)) * 2;

      return {
        zIndex: -1,
        position: 'absolute',
        inset: `-${blur}rem`,
        background: mode === 'image' ? `url(${props.imgUrl})` : color?.rgba,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter:
          mode === 'image' ? image?.filters?.map(it => `${it.type}(${it.value})`).join(' ') : '',
        pointerEvents: 'none',
        ...mapStyle(style),
      };
    });

    const isLoading = ref(true);
    const el = ref<HTMLDivElement>();
    const bgEl = ref<HTMLDivElement>();
    // const [ow, oh] = [1280, 720]

    onMounted(async () => {
      setTimeout(() => {
        handleCalcSize();
      }, 200);
    });

    watch(() => [props.settings, props.tpl, props.tplProps], () => {
      setTimeout(() => {
        handleCalcSize();
      }, 0);
    }, { deep: true });

    const offWinResize = window.api.onWinResized(() => {
      setTimeout(() => {
        handleCalcSize();
      }, 20);
    });
    onBeforeUnmount(() => {
      offWinResize();
    });

    // function formatExpression(expression: string | undefined, data: Tags) {
    //   if (!expression) return '';
    //   return expression.replace(/\${(\w+)}/g, (_, key) => data[key]?.description || '');
    // }

    const { currentCoPic } = injectCoPic();

    function render() {
      // const { fields } = props.settings;

      // return fields.map((field) => renderNode(field, true));
      const handler = {
        get(target: Record<string, string>, key: string) {
          currentCoPic.value.addExifKey(key);

          return target[key];
        },
      };
      const info = new Proxy(
        Object.keys(props.exif).reduce((acc, key) => {
          acc[key] = props.exif[key] || '';
          return acc;
        }, {} as Tags),
        handler,
      );

      return (
        <props.tpl
          {...props.tplProps}
          data-co-tpl={props.tpl.__scopeId}
          utils={renderUtils}
          info={info}
          imgUrl={props.imgUrl}
        />
      );
    }

    // function renderNode(field: SettingsField, isRoot = false) {
    //   if (field.type === 'container') {
    //     return (
    //       <div class={{ root: isRoot }} style={field.style}>
    //         {field.children?.map((f) => renderNode(f))}
    //       </div>
    //     );
    //   }
    //   if (field.type === 'main-image') {
    //     // return (
    //     //   <div
    //     //     class="main-image"
    //     //     style={{ ...field.style, backgroundImage: `url(${props.imgUrl})`, backgroundSize: 'cover' }}
    //     //   ></div>
    //     // )
    //     return (
    //       <img class="main-image" style={{ ...field.style, display: 'block' }} src={props.imgUrl} />
    //     );
    //   }
    //   if (field.type === 'text') {
    //     return <div style={field.style}>{formatExpression(field.expression, props.exif)}</div>;
    //   }
    //   return field.type;
    // }

    function handleCalcSize() {
      const wrapperEl = el.value?.parentElement?.parentElement;
      console.log(el.value, bgEl.value, wrapperEl);
      if (el.value && bgEl.value && wrapperEl) {
        const { width, height } = wrapperEl.getBoundingClientRect();
        calcSize(el.value, bgEl.value, [width, height]);
        // calcSize(el.value, bgEl.value, [1280, 720])
        // console.log(wrapperEl, [width, height])
      }
    }

    async function calcSize(
      _wrapper: HTMLDivElement,
      containerEl: HTMLDivElement,
      [ow, oh]: number[],
    ) {
      containerEl.style.width = '';
      containerEl.style.height = '';
      containerEl.style.minWidth = '';
      containerEl.style.minHeight = '';
      const initialWidth = 400;
      document.querySelector('html')!.style.fontSize = `${initialWidth}px`;

      const mainImage = containerEl.querySelector<HTMLDivElement>('.main-image');
      if (!mainImage)
        return;

      const [iw, ih] = await getImgSize();
      console.log(iw, ih);
      //   const { width: iw, height: ih } = mainImage.getBoundingClientRect()
      console.log(mainImage);

      if (iw < ih) {
        mainImage.style.width = `${iw / ih}rem`;
        mainImage.style.height = '1rem';
      }
      else {
        mainImage.style.width = '1rem';
        mainImage.style.height = `${ih / iw}rem`;
      }
      const scale = 4;
      const wr = iw / ih * scale;
      const hr = wr * (ih / iw);
      mainImage.style.width = `${wr}rem`;
      mainImage.style.height = `${hr}rem`;

      console.log(containerEl);

      const { width: w1, height: h1 } = containerEl.getBoundingClientRect();

      const imgRatio = w1 / h1;

      //   const [ow, oh] = [1280, 720]
      // const [ow, oh] = [108, 192];
      console.log({ w1, h1, ow, oh });

      console.log(imgRatio, ow / oh);
      isHorizontal.value = imgRatio <= ow / oh;
      const fontSize = isHorizontal.value ? (initialWidth * oh) / h1 : (initialWidth * ow) / w1;

      document.querySelector('html')!.style.fontSize = `${fontSize}px`;

      sizeRatio.value = isHorizontal.value ? oh / fontSize : ow / fontSize;
      console.log('sizeRatio', sizeRatio.value, isHorizontal.value);

      if (props.settings.background.mode === 'none') {
        ow = oh * imgRatio;
      }

      containerEl.style.width = `${ow}px`;
      containerEl.style.height = `${oh}px`;
      containerEl.style.minWidth = `${ow}px`;
      containerEl.style.minHeight = `${oh}px`;
      isLoading.value = false;
    }

    function getImgSize() {
      const { ImageWidth, ImageHeight } = props.exif;
      if (ImageWidth && ImageHeight)
        return [+ImageWidth, +ImageHeight];

      const img = new Image();
      img.src = props.imgUrl;

      return new Promise<[number, number]>((resolve) => {
        img.onload = () => {
          resolve([img.width, img.height]);
        };
        img.onerror = () => {
          resolve([0, 0]);
        };
      });
    }
    return () => (
      <div ref={el} class="co-render" style={{ opacity: isLoading.value ? 0 : 1 }}>
        <div ref={bgEl} class="background" style={bgStyle.value}>
          <div class="background-image" style={bgImgStyle.value}></div>
          {render()}
        </div>
      </div>
    );
  },
});
</script>
