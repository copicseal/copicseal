import type { Output } from '@renderer/types';
import { injectCoPic } from '@renderer/uses/co-pic';
import { nextTick } from 'vue';
import { injectProgress } from './progress';

export function useExport() {
  const { currentCoPic, currentIndex, list } = injectCoPic();
  const progress = injectProgress();

  async function exportToImage() {
    const filename = currentCoPic.value.name;
    const { outputs, background, outputPath } = currentCoPic.value.getSettings();
    if (!outputPath) {
      // eslint-disable-next-line no-alert
      return alert('请先设置导出目录');
    }
    const renderEl = document.querySelector('.co-render')!;
    const bgEl = document.querySelector<HTMLDivElement>('.background')!;
    const bgStyle = Object.assign({}, bgEl.style);
    Object.assign(bgEl.style, {
      width: '',
      height: '',
      minWidth: '',
      minHeight: '',
    });
    const tplEl = renderEl.querySelector<HTMLDivElement>('[data-co-tpl]')!;
    const style = tplEl
      ? Array.from(document.querySelectorAll('style')).find(style =>
        style.textContent?.includes(`[${tplEl.dataset.coTpl}]`),
      )
      || document.querySelector('link[rel=stylesheet]')
      : document.querySelector('style#co-style');

    const { width, height } = renderEl.getBoundingClientRect()!;
    const fontSize = document.querySelector('html')!.style.fontSize;
    await new Promise(r => setTimeout(r, 20));
    console.time('capture');
    const html = `
      <style>html{ font-size: ${fontSize}; }</style>
      <style>body{margin: 0; padding: 0; background-color: black; font-family: "Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","微软雅黑",Arial,sans-serif; overflow: hidden; } * { box-sizing: border-box;  }</style>
      ${style?.outerHTML || ''}
      ${renderEl.outerHTML || ''}
    `;
    Object.assign(bgEl.style, {
      width: bgStyle.width,
      height: bgStyle.height,
      minWidth: bgStyle.minWidth,
      minHeight: bgStyle.minHeight,
    });
    const res = await window.api.captureDOM({
      html,
      output: [
        ...outputs.map((output, index) => {
          output = { ...output };
          let fs = Number.parseFloat(fontSize);
          const outputRatio = output.width / output.height;
          const containerRatio = width / height;
          if (outputRatio > containerRatio) {
            fs = (output.height / height) * fs;
          }
          else {
            fs = (output.width / width) * fs;
          }
          if (background.mode === 'none') {
            if (outputRatio > containerRatio) {
              output.width = Math.floor(output.height * containerRatio);
            }
            else {
              output.height = Math.floor(output.width / containerRatio);
            }
          }

          return {
            ...output,
            rem: fs,
            path: `${outputPath}/${getOutputFilename(filename, outputs, index)}`,
          };
        }),
      ],
    });
    console.timeEnd('capture');
    console.log(res);
  }

  function checkOutputPath() {
    const { outputPath } = currentCoPic.value.getSettings();
    if (!outputPath) {
      // eslint-disable-next-line no-alert
      return void alert('请先设置【输出】-【导出目录】');
    }
    return true;
  }

  async function handleExport() {
    if (!checkOutputPath())
      return;
    progress.value.visible = true;
    progress.value.current = 0;
    progress.value.total = 1;
    progress.value.filename = currentCoPic.value.name;
    console.log(progress.value);
    await exportToImage();
    progress.value.current = 1;
  }

  async function handleExportAll() {
    if (!checkOutputPath())
      return;
    console.time('exportAll');
    progress.value.visible = true;
    await list.value.reduce(async (p, _pic, index) => {
      await p;
      if (!progress.value.visible)
        return;
      currentIndex.value = index;
      progress.value.current = index;
      progress.value.total = list.value.length;
      progress.value.filename = currentCoPic.value.name;
      await new Promise(r => setTimeout(r, 300));
      await nextTick();
      await exportToImage();
      progress.value.current += 1;
    }, Promise.resolve());
    console.timeEnd('exportAll');
  }

  return {
    handleExport,
    handleExportAll,
  };
}

function getOutputFilename(filename: string, outputs: Output[], index: number) {
  const output = outputs[index];
  const baseName = filename.split('.').slice(0, -1).join('.');
  const outputType = output.type === 'jpeg' ? 'jpg' : output.type;

  const outputName = `${baseName}@${output.width}x${output.height}.${outputType}`;

  return outputName;
}
