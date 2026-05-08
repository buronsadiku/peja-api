import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '../../config/env.js';
import {
  PRESIGN_PUT_EXPIRY_SEC,
  PRESIGN_GET_EXPIRY_SEC,
} from '../../common/constants.js';

export type PresignedPut = {
  url: string;
  key: string;
  headers: Record<string, string>;
  expiresAt: Date;
};

@Injectable()
export class S3Adapter {
  private readonly logger = new Logger('S3Adapter');
  private client: S3Client | null = null;
  private bucket = '';
  private publicDomain = '';
  private enabled = false;

  constructor() {
    const env = getEnv();
    if (
      env.OBJECT_STORAGE_ENDPOINT &&
      env.OBJECT_STORAGE_BUCKET &&
      env.OBJECT_STORAGE_ACCESS_KEY &&
      env.OBJECT_STORAGE_SECRET_KEY
    ) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: env.OBJECT_STORAGE_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY,
          secretAccessKey: env.OBJECT_STORAGE_SECRET_KEY,
        },
      });
      this.bucket = env.OBJECT_STORAGE_BUCKET;
      this.publicDomain = env.OBJECT_STORAGE_PUBLIC_DOMAIN || '';
      this.enabled = true;
      this.logger.log('Object storage initialized');
    } else {
      this.logger.warn('Object storage not configured — storage disabled');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPublicDomain(): string {
    return this.publicDomain;
  }

  async presignPut(
    key: string,
    contentType: string,
    expiresInSec = PRESIGN_PUT_EXPIRY_SEC,
  ): Promise<PresignedPut> {
    if (!this.client) throw new Error('Storage not configured');
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSec,
    });
    return {
      url,
      key,
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(Date.now() + expiresInSec * 1000),
    };
  }

  async presignGet(
    key: string,
    expiresInSec = PRESIGN_GET_EXPIRY_SEC,
  ): Promise<{ url: string; expiresAt: Date }> {
    if (!this.client) throw new Error('Storage not configured');
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSec,
    });
    return { url, expiresAt: new Date(Date.now() + expiresInSec * 1000) };
  }

  async headObject(
    key: string,
  ): Promise<{ size: number; contentType: string } | null> {
    if (!this.client) throw new Error('Storage not configured');
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        size: res.ContentLength ?? 0,
        contentType: res.ContentType ?? 'application/octet-stream',
      };
    } catch (error: unknown) {
      const err = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404)
        return null;
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    if (!this.client) throw new Error('Storage not configured');
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async listObjects(
    prefix: string,
  ): Promise<Array<{ key: string; size: number }>> {
    if (!this.client) return [];
    const result = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
    );
    return (result.Contents ?? []).map((obj) => ({
      key: obj.Key ?? '',
      size: obj.Size ?? 0,
    }));
  }
}
