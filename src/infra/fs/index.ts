import { invoke } from '@tauri-apps/api/core';

export interface ImageFileMeta {
  name: string;
  path: string;
  size: number;
  ext: string;
  mime_type: string;
}

export function readImageFile(path: string): Promise<ImageFileMeta> {
  return invoke<ImageFileMeta>('read_image_file', { path });
}

export function writeBinaryFile(path: string, contents: number[]): Promise<void> {
  return invoke('write_file', { path, contents });
}

export function listImageFilesInDirectory(path: string): Promise<string[]> {
  return invoke<string[]>('list_image_files_in_directory', { path });
}
