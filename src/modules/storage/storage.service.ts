import { Injectable } from '@nestjs/common';
import { S3Adapter } from './s3.adapter.js';
import {
  MEDIA_MAX_SIZES,
  ACCEPTED_MIMES,
  PRESIGN_GET_EXPIRY_SEC,
} from '../../common/constants.js';

const MIME_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/webm': 'webm',
  'video/mp4': 'mp4',
};

export type PresignedUpload = {
  kind: string;
  url: string;
  key: string;
  headers: Record<string, string>;
  maxSizeBytes: number;
  expiresAt: Date;
};

@Injectable()
export class StorageService {
  constructor(private readonly s3: S3Adapter) {}

  isEnabled(): boolean {
    return this.s3.isEnabled();
  }

  // --- S3 primitive passthroughs (used by processors / cleanup) ---

  headObject(
    key: string,
  ): Promise<{ size: number; contentType: string } | null> {
    return this.s3.headObject(key);
  }

  deleteObject(key: string): Promise<void> {
    return this.s3.deleteObject(key);
  }

  uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    return this.s3.uploadBuffer(key, buffer, contentType);
  }

  listObjects(prefix: string): Promise<Array<{ key: string; size: number }>> {
    return this.s3.listObjects(prefix);
  }

  // --- Domain methods ---

  private normalizeContentType(contentType: string): string {
    return contentType.split(';')[0].trim().toLowerCase();
  }

  private getExt(contentType: string): string {
    const base = this.normalizeContentType(contentType);
    return MIME_TO_EXT[base] || 'bin';
  }

  async presignAudioUpload(
    eventId: string,
    messageId: string,
    contentType: string,
  ): Promise<PresignedUpload> {
    const normalized = this.normalizeContentType(contentType);
    const key = `events/${eventId}/messages/${messageId}/audio.${this.getExt(normalized)}`;
    const result = await this.s3.presignPut(key, normalized);
    return { ...result, kind: 'audio', maxSizeBytes: MEDIA_MAX_SIZES.audio };
  }

  async presignMediaUpload(params: {
    eventId: string;
    mediaId: string;
    type: 'photo' | 'video';
    contentType: string;
  }): Promise<PresignedUpload> {
    const normalized = this.normalizeContentType(params.contentType);
    if (!ACCEPTED_MIMES[params.type].includes(normalized as never)) {
      throw new Error(`Unsupported ${params.type} content type: ${normalized}`);
    }
    const key = `events/${params.eventId}/media/${params.mediaId}.${this.getExt(normalized)}`;
    const result = await this.s3.presignPut(key, normalized);
    return {
      ...result,
      kind: params.type,
      maxSizeBytes: MEDIA_MAX_SIZES[params.type],
    };
  }

  async presignCoverUpload(
    eventId: string,
    contentType: string,
  ): Promise<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    headers: Record<string, string>;
    maxSizeBytes: number;
    expiresAt: Date;
  }> {
    if (!ACCEPTED_MIMES.photo.includes(contentType as never)) {
      throw new Error(`Unsupported cover photo content type: ${contentType}`);
    }
    const publicDomain = this.s3.getPublicDomain();
    if (!publicDomain) {
      throw new Error('OBJECT_STORAGE_PUBLIC_DOMAIN is not configured');
    }
    const key = `events/${eventId}/cover-${Date.now()}.${this.getExt(contentType)}`;
    const result = await this.s3.presignPut(key, contentType);
    return {
      uploadUrl: result.url,
      publicUrl: `${publicDomain.replace(/\/$/, '')}/${key}`,
      key,
      headers: result.headers,
      maxSizeBytes: MEDIA_MAX_SIZES.photo,
      expiresAt: result.expiresAt,
    };
  }

  async presignPlaybackUrl(
    key: string,
    expiresInSec = PRESIGN_GET_EXPIRY_SEC,
  ): Promise<string> {
    const { url } = await this.s3.presignGet(key, expiresInSec);
    return url;
  }

  verifyUploaded(
    key: string,
  ): Promise<{ size: number; contentType: string } | null> {
    return this.s3.headObject(key);
  }

  static isValidMimeType(
    kind: 'audio' | 'video' | 'photo',
    mimeType: string,
  ): boolean {
    return (ACCEPTED_MIMES[kind] as readonly string[]).includes(mimeType);
  }

  static getMaxSize(kind: 'audio' | 'video' | 'photo'): number {
    return MEDIA_MAX_SIZES[kind];
  }
}
