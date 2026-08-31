import { extractJpegExif, insertJpegExif, readExif } from './api';

export class TauriImageAdapter {
  readonly readExif = readExif;
  readonly extractJpegExif = extractJpegExif;
  readonly insertJpegExif = insertJpegExif;
}
