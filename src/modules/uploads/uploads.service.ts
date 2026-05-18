import { Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import {
  s3,
  STORAGE_BUCKET,
  STORAGE_PUBLIC_DOMAIN,
} from '../../storage/s3.js';

export type UploadFolder =
  | 'gallery'
  | 'activities'
  | 'communities'
  | 'musicians';

const MAX_DIM = 1920;
const WEBP_QUALITY = 82;

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  async uploadImage(
    folder: UploadFolder,
    buffer: Buffer,
    originalName: string,
  ): Promise<{ publicUrl: string; bytesIn: number; bytesOut: number }> {
    const image = sharp(buffer, { failOn: 'error' }).rotate();
    const metadata = await image.metadata();

    const pipeline = image
      .resize({
        width: MAX_DIM,
        height: MAX_DIM,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 4 });

    const compressed = await pipeline.toBuffer();

    const baseName = originalName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .slice(-60);
    const key = `public/${folder}/${randomUUID()}-${baseName || 'image'}.webp`;

    await s3.send(
      new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: key,
        Body: compressed,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    this.logger.log(
      `upload ${folder} ${(buffer.length / 1024).toFixed(0)}kB → ${(compressed.length / 1024).toFixed(0)}kB ${metadata.width}x${metadata.height}`,
    );

    return {
      publicUrl: `${STORAGE_PUBLIC_DOMAIN}/${key}`,
      bytesIn: buffer.length,
      bytesOut: compressed.length,
    };
  }
}
