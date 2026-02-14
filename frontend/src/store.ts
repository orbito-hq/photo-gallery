import { create } from 'zustand';

export interface FileData {
  id: string;
  name: string;
  absolutePath: string;
  size: number;
  extension: string;
  type: 'image' | 'video' | 'text' | 'binary';
  createdAt: string;
  position?: [number, number, number];
}

interface CameraTarget {
  position: [number, number, number];
  lookAt: [number, number, number];
  startPosition: [number, number, number];
  startLookAt: [number, number, number];
  progress: number;
}

interface AppState {
  files: Map<string, FileData>;
  loadedFiles: Set<string>;
  thumbnails: Map<string, string>;
  cursor: number | null;
  totalFiles: number;
  selectedFileId: string | null;
  hoveredFileId: string | null;
  vrEnabled: boolean;
  cameraTarget: CameraTarget | null;
  isFocused: boolean;
  addFile: (file: FileData) => void;
  removeFile: (id: string) => void;
  setThumbnail: (id: string, url: string) => void;
  setCursor: (cursor: number | null) => void;
  setTotalFiles: (count: number) => void;
  markLoaded: (id: string) => void;
  setSelectedFile: (id: string | null) => void;
  setHoveredFile: (id: string | null) => void;
  setVREnabled: (enabled: boolean) => void;
  setCameraTarget: (target: CameraTarget | null) => void;
  setIsFocused: (focused: boolean) => void;
  clearFocus: () => void;
}

export const useStore = create<AppState>((set) => ({
  files: new Map(),
  loadedFiles: new Set(),
  thumbnails: new Map(),
  cursor: null,
  totalFiles: 0,
  selectedFileId: null,
  hoveredFileId: null,
  vrEnabled: false,
  cameraTarget: null,
  isFocused: false,
  addFile: (file) => set((state) => {
    const newFiles = new Map(state.files);
    newFiles.set(file.id, file);
    return { files: newFiles };
  }),
  removeFile: (id) => set((state) => {
    const newFiles = new Map(state.files);
    newFiles.delete(id);
    const newThumbnails = new Map(state.thumbnails);
    newThumbnails.delete(id);
    return { files: newFiles, thumbnails: newThumbnails };
  }),
  setThumbnail: (id, url) => set((state) => {
    const newThumbnails = new Map(state.thumbnails);
    newThumbnails.set(id, url);
    return { thumbnails: newThumbnails };
  }),
  setCursor: (cursor) => set({ cursor }),
  setTotalFiles: (count) => set({ totalFiles: count }),
  markLoaded: (id) => set((state) => {
    const newLoaded = new Set(state.loadedFiles);
    newLoaded.add(id);
    return { loadedFiles: newLoaded };
  }),
  setSelectedFile: (id) => set({ selectedFileId: id }),
  setHoveredFile: (id) => set({ hoveredFileId: id }),
  setVREnabled: (enabled) => set({ vrEnabled: enabled }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  setIsFocused: (focused) => set({ isFocused: focused }),
  clearFocus: () => set({ selectedFileId: null, cameraTarget: null, isFocused: false })
}));
