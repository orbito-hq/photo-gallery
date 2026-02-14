class FileStore {
  constructor() {
    this.files = new Map();
    this.lastScanTime = null;
  }

  addFile(file) {
    this.files.set(file.id, file);
  }

  removeFile(id) {
    this.files.delete(id);
  }

  getFile(id) {
    return this.files.get(id);
  }

  getFiles(cursor = 0, limit = 100) {
    const filesArray = Array.from(this.files.values());
    return filesArray.slice(cursor, cursor + limit);
  }

  getTotalCount() {
    return this.files.size;
  }

  getLastScanTime() {
    return this.lastScanTime;
  }

  setLastScanTime(time) {
    this.lastScanTime = time;
  }
}

export const fileStore = new FileStore();
