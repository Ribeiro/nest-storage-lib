export class GetSignedUrlDto {
  bucket: string;
  key: string;
  expiresIn?: number; // tempo em segundos
}