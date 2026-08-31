import { webFiles } from './web-platform-provider';

export class WebFileAdapter {
  pickImages = webFiles.pickImages.bind(webFiles);
  save = webFiles.save.bind(webFiles);
  toUrl = webFiles.toUrl.bind(webFiles);
}
