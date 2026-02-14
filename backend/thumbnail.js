import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { extname } from 'path';

class ThumbnailGenerator {
  async generate(filePath, fileType) {
    if (fileType === 'image') {
      return await this._generateImageThumbnail(filePath);
    } else if (fileType === 'video') {
      return await this._generateVideoThumbnail(filePath);
    } else {
      return await this._generateIconThumbnail(fileType);
    }
  }

  async _generateImageThumbnail(filePath) {
    try {
      return await sharp(filePath)
        .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      return await this._generateIconThumbnail('image');
    }
  }

  async _generateVideoThumbnail(filePath) {
    return await this._generateIconThumbnail('video');
  }

  async _generateIconThumbnail(fileType) {
    const size = 256;
    const canvas = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 40, g: 40, b: 40, alpha: 1 }
      }
    });

    return await canvas
      .jpeg({ quality: 85 })
      .toBuffer();
  }
}

export const thumbnailGenerator = new ThumbnailGenerator();
