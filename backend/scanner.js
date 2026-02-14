import { EventEmitter } from 'events';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { createHash } from 'crypto';
import chokidar from 'chokidar';

class FileScanner extends EventEmitter {
  constructor() {
    super();
    this.scanning = false;
    this.watcher = null;
  }

  async scanDirectory(dirPath) {
    if (this.scanning) return;
    this.scanning = true;

    try {
      await this._scanRecursive(dirPath, dirPath);
      this.emit('scan-complete', new Date().toISOString());
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      this.scanning = false;
    }
  }

  async _scanRecursive(dirPath, rootPath) {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      try {
        if (entry.isDirectory()) {
          await this._scanRecursive(fullPath, rootPath);
        } else if (entry.isFile()) {
          const stats = await stat(fullPath);
          const file = this._createFileObject(fullPath, stats);
          this.emit('file-added', file);
        }
      } catch (error) {
        console.error(`Error processing ${fullPath}:`, error.message);
      }
    }
  }

  _createFileObject(absolutePath, stats) {
    const ext = extname(absolutePath).toLowerCase();
    const id = createHash('sha256').update(absolutePath).digest('hex').substring(0, 16);
    
    const type = this._getFileType(ext);
    
    return {
      id,
      name: absolutePath.split(/[/\\]/).pop(),
      absolutePath,
      size: stats.size,
      extension: ext,
      type,
      createdAt: stats.birthtime.toISOString()
    };
  }

  _getFileType(ext) {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'];
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
    const textExts = ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css'];
    
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (textExts.includes(ext)) return 'text';
    return 'binary';
  }

  start(rootPath) {
    this.scanDirectory(rootPath);
    
    this.watcher = chokidar.watch(rootPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true
    });

    this.watcher.on('add', async (path) => {
      try {
        const stats = await stat(path);
        const file = this._createFileObject(path, stats);
        this.emit('file-added', file);
      } catch (error) {
        console.error(`Error watching file ${path}:`, error.message);
      }
    });

    this.watcher.on('unlink', (path) => {
      const id = createHash('sha256').update(path).digest('hex').substring(0, 16);
      this.emit('file-removed', id);
    });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}

export const fileScanner = new FileScanner();
