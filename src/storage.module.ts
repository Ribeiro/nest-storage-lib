import { Module } from '@nestjs/common';
import { S3StorageService } from './s3/s3-storage.service';

@Module({
  providers: [S3StorageService],
  exports: [S3StorageService],
})
export class StorageModule {}
