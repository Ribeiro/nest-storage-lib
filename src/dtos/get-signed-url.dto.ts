export class GetSignedUrlDto {
  bucket!: string;
  key!: string;
  expiresInSeconds?: number;
}