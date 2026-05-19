import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { UploadApiResponse } from 'cloudinary';
import {
  CLOUDINARY_ROOT_FOLDER,
  getCloudinary,
  isCloudinaryConfigured,
} from '../../storage/cloudinary.js';

export type UploadFolder =
  | 'gallery'
  | 'activities'
  | 'communities'
  | 'musicians';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  async uploadImage(
    folder: UploadFolder,
    buffer: Buffer,
    originalName: string,
  ): Promise<{ publicUrl: string; bytesIn: number; bytesOut: number }> {
    if (!isCloudinaryConfigured()) {
      throw new InternalServerErrorException({
        code: 'cloudinary_not_configured',
        message:
          'Cloudinary creds missing — set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME + _API_KEY + _API_SECRET)',
      });
    }

    const cld = getCloudinary();
    const baseName = originalName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .slice(-60) || 'image';

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cld.uploader.upload_stream(
        {
          folder: `${CLOUDINARY_ROOT_FOLDER}/${folder}`,
          public_id: baseName,
          unique_filename: true,
          overwrite: false,
          resource_type: 'image',
          // Cloudinary handles EXIF rotation, format conversion, and quality.
          // `quality: auto` + `fetch_format: auto` defer the best format
          // (AVIF/WebP/JPG) to delivery time via URL transforms.
          quality: 'auto',
          fetch_format: 'auto',
          transformation: [
            {
              width: 1920,
              height: 1920,
              crop: 'limit',
            },
          ],
        },
        (err, res) => {
          if (err || !res) {
            reject(err ?? new Error('cloudinary returned no response'));
            return;
          }
          resolve(res);
        },
      );
      stream.end(buffer);
    });

    this.logger.log(
      `upload ${folder} ${(buffer.length / 1024).toFixed(0)}kB → ${(result.bytes / 1024).toFixed(0)}kB ${result.width}x${result.height}`,
    );

    return {
      publicUrl: result.secure_url,
      bytesIn: buffer.length,
      bytesOut: result.bytes,
    };
  }
}
