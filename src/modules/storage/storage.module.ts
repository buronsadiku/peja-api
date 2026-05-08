import { Global, Module } from '@nestjs/common';
import { S3Adapter } from './s3.adapter.js';
import { StorageService } from './storage.service.js';

@Global()
@Module({
  providers: [S3Adapter, StorageService],
  exports: [S3Adapter, StorageService],
})
export class StorageModule {}
