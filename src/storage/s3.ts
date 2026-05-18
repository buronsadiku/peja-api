import { S3Client } from '@aws-sdk/client-s3';

const endpoint =
  process.env.OBJECT_STORAGE_ENDPOINT ?? 'http://localhost:9000';
const accessKeyId =
  process.env.OBJECT_STORAGE_ACCESS_KEY ?? 'minioadmin';
const secretAccessKey =
  process.env.OBJECT_STORAGE_SECRET_KEY ?? 'minioadmin';

export const s3 = new S3Client({
  endpoint,
  region: 'us-east-1',
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

export const STORAGE_BUCKET =
  process.env.OBJECT_STORAGE_BUCKET ?? 'peja-uploads';

export const STORAGE_PUBLIC_DOMAIN =
  process.env.OBJECT_STORAGE_PUBLIC_DOMAIN ??
  `${endpoint}/${STORAGE_BUCKET}`;
