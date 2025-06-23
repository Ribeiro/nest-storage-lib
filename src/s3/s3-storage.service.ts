import { Injectable, Logger } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { StorageService } from "../interfaces/storage-service.interface";
import { Readable } from "stream";
import { UploadFileDto } from "../dtos/upload-file.dto";
import { DownloadFileDto } from "../dtos/download-file.dto";
import { DeleteFileDto } from "../dtos/delete-file.dto";
import { ListFilesDto } from "../dtos/list-files.dto";
import { GetSignedUrlDto } from "../dtos/get-signed-url.dto";
import { getSignedUrl as generateSignedUrl } from '@aws-sdk/s3-request-presigner';


@Injectable()
export class S3StorageService implements StorageService {
  private readonly s3: S3Client;
  private readonly logger = new Logger(S3StorageService.name);

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFiles(data: UploadFileDto[]): Promise<void> {
    this.logger.log(`Uploading ${data.length} file(s) to S3...`);

    try {
      await Promise.all(
        data.map((file) =>
          this.s3.send(
            new PutObjectCommand({
              Bucket: file.bucket,
              Key: file.key,
              Body: file.content,
              ContentType: file.contentType || "application/octet-stream",
            })
          )
        )
      );

      this.logger.log(`Upload completed successfully.`);
    } catch (error) {
      this.logger.error(
        `Failed to upload files to S3`,
        error instanceof Error ? error.stack : ""
      );
      throw error;
    }
  }

  async downloadFiles(data: DownloadFileDto[]): Promise<Buffer[]> {
    this.logger.log(`Downloading ${data.length} file(s) from S3...`);

    try {
      return await Promise.all(
        data.map(async (file) => {
          const response = await this.s3.send(
            new GetObjectCommand({
              Bucket: file.bucket,
              Key: file.key,
            })
          );

          const stream = response.Body as Readable;
          const chunks: Uint8Array[] = [];

          for await (const chunk of stream) {
            chunks.push(chunk);
          }

          return Buffer.concat(chunks);
        })
      );
    } catch (error) {
      this.logger.error(
        `Failed to download files from S3`,
        error instanceof Error ? error.stack : ""
      );
      throw error;
    }
  }

  async deleteFiles(data: DeleteFileDto[]): Promise<void> {
    this.logger.log(`Deleting ${data.length} file(s) from S3...`);

    try {
      await Promise.all(
        data.map((file) =>
          this.s3.send(
            new DeleteObjectCommand({
              Bucket: file.bucket,
              Key: file.key,
            })
          )
        )
      );

      this.logger.log(`Deletion completed successfully.`);
    } catch (error) {
      this.logger.error(
        `Failed to delete files from S3`,
        error instanceof Error ? error.stack : ""
      );
      throw error;
    }
  }

  async listFiles(data: ListFilesDto): Promise<string[]> {
    this.logger.log(
      `Listing files from bucket "${data.bucket}" with prefix "${
        data.prefix || ""
      }"...`
    );

    try {
      const response = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: data.bucket,
          Prefix: data.prefix || "",
        })
      );

      const keys = response.Contents?.map((obj) => obj.Key!) ?? [];

      this.logger.log(`Found ${keys.length} file(s).`);
      return keys;
    } catch (error) {
      this.logger.error(
        `Failed to list files from S3`,
        error instanceof Error ? error.stack : ""
      );
      throw error;
    }
  }

  async getSignedUrl(data: GetSignedUrlDto): Promise<string> {
    this.logger.log(
      `Generating signed URL for s3://${data.bucket}/${data.key}...`
    );

    try {
      const command = new GetObjectCommand({
        Bucket: data.bucket,
        Key: data.key,
      });

      const url = await generateSignedUrl(this.s3, command, {
        expiresIn: data.expiresIn ?? 3600, // default 1 hora
      });

      this.logger.log(`Signed URL generated successfully.`);
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL`,
        error instanceof Error ? error.stack : ""
      );
      throw error;
    }
  }
}
