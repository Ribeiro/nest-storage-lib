export interface UploadFileDto {
  bucket: string;
  key: string;
  content: Buffer;
  contentType?: string;
}