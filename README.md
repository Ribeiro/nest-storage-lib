# StorageService

O `StorageService` é uma interface genérica para upload, download, listagem e exclusão de arquivos em diferentes backends de armazenamento — como sistemas locais, redes internas ou nuvens públicas (ex: AWS S3).

Essa biblioteca é compatível com NestJS e permite abstrair o armazenamento de arquivos, tornando fácil trocar de provedor ou adaptar para múltiplos ambientes.

## 📦 Instalação

Clone ou copie o conteúdo da biblioteca `StorageService` para o seu projeto NestJS.

> ⚠️ Esta lib pressupõe o uso de TypeScript e NestJS 9+.

Instale também o cliente da AWS:

```bash
npm install @aws-sdk/client-s3
```

### Interface Genérica

```typescript
export interface StorageService {
  uploadFiles(data: UploadFileDto[]): Promise<void>;
  downloadFiles(data: DownloadFileDto[]): Promise<Buffer[]>;
  deleteFiles(data: DeleteFileDto[]): Promise<void>;
  listFiles(data: ListFilesDto): Promise<string[]>;
}
```

### DTOs incluídos

* UploadFileDto: usado para upload de arquivos.
* DownloadFileDto: usado para download de arquivos.
* DeleteFileDto: usado para remoção de arquivos.
* ListFilesDto: usado para listagem com filtro de prefixo.

### Implementação com AWS S3

- A classe S3StorageService implementa a interface para uso com Amazon S3, utilizando o cliente oficial @aws-sdk/client-s3.

## Exemplo:

```typescript
import { Injectable } from '@nestjs/common';
import { S3StorageService } from './s3/s3-storage.service';

@Injectable()
export class MyService {
  constructor(private readonly storage: S3StorageService) {}

  async salvarArquivo() {
    await this.storage.uploadFiles([
      {
        bucket: 'my-bucket',
        key: 'docs/file.pdf',
        content: Buffer.from('conteúdo do arquivo'),
        contentType: 'application/pdf',
      },
    ]);
  }
}
```

### Logger e Tratamento de Erros

- A implementação com S3 usa o logger padrão do NestJS para registrar:

* Uploads realizados
* Downloads solicitados
* Listagem de arquivos
* Exclusões bem-sucedidas
* Erros lançados (com detalhes do stack trace)
* Exceções são propagadas normalmente, permitindo uso do RetryService para retentativas, se necessário.

### Vantagens

✅ Interface genérica e extensível
✅ Suporte a múltiplos buckets e arquivos por operação
✅ Compatível com NestJS DI (injeção de dependência)
✅ Totalmente testada com Jest
✅ Pronta para produção com AWS S3