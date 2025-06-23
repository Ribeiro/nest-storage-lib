import { DeleteFileDto } from "../dtos/delete-file.dto";
import { DownloadFileDto } from "../dtos/download-file.dto";
import { GetSignedUrlDto } from "../dtos/get-signed-url.dto";
import { ListFilesDto } from "../dtos/list-files.dto";
import { UploadFileDto } from "../dtos/upload-file.dto";

export interface StorageService {
  uploadFiles(data: UploadFileDto[]): Promise<void>;
  downloadFiles(data: DownloadFileDto[]): Promise<Buffer[]>;
  deleteFiles(data: DeleteFileDto[]): Promise<void>;
  listFiles(data: ListFilesDto): Promise<string[]>;
  getSignedUrl(data: GetSignedUrlDto): Promise<string>;
}