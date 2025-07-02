import { S3StorageService } from "./s3-storage.service";
import { ClassSerializerInterceptor, Logger } from "@nestjs/common";

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return {
    ...actual,
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    ListObjectsV2Command: jest.fn().mockImplementation((input) => ({ input })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: jest.fn(),
  };
});

import { Readable } from "stream";
function ReadableFromString(text: string): Readable {
  const stream = new Readable();
  stream.push(text);
  stream.push(null);
  return stream;
}

describe("S3StorageService", () => {
  let service: S3StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new S3StorageService();
    (service as any).logger = new Logger();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should upload files", async () => {
    const mockSend = jest.fn().mockResolvedValue({});
    (service as any).s3.send = mockSend;

    await service.uploadFiles([
      {
        bucket: "test-bucket",
        key: "file.txt",
        content: Buffer.from("Hello"),
        contentType: "text/plain",
      },
    ]);

    const calledCommand = mockSend.mock.calls[0][0];
    expect(calledCommand.input.Bucket).toBe("test-bucket");
    expect(calledCommand.input.Key).toBe("file.txt");
    expect(calledCommand.input.ContentType).toBe("text/plain");
  });

  it("should download files", async () => {
    const mockBody = ReadableFromString("file content");
    const mockSend = jest.fn().mockResolvedValue({ Body: mockBody });
    (service as any).s3.send = mockSend;

    const result = await service.downloadFiles([
      { bucket: "test-bucket", key: "file.txt" },
    ]);

    const sent = mockSend.mock.calls[0][0];
    expect(sent.input.Bucket).toBe("test-bucket");
    expect(sent.input.Key).toBe("file.txt");
    expect(result[0].toString()).toBe("file content");
  });

  it("should delete files", async () => {
    const mockSend = jest.fn().mockResolvedValue({});
    (service as any).s3.send = mockSend;

    await service.deleteFiles([{ bucket: "test-bucket", key: "file.txt" }]);

    const sent = mockSend.mock.calls[0][0];
    expect(sent.input.Bucket).toBe("test-bucket");
    expect(sent.input.Key).toBe("file.txt");
  });

  it("should list files", async () => {
    const mockSend = jest.fn().mockResolvedValue({
      Contents: [{ Key: "file1.txt" }, { Key: "file2.txt" }],
    });
    (service as any).s3.send = mockSend;

    const result = await service.listFiles({
      bucket: "test-bucket",
      prefix: "",
    });

    const sent = mockSend.mock.calls[0][0];
    expect(sent.input.Bucket).toBe("test-bucket");
    expect(sent.input.Prefix).toBe("");
    expect(result).toEqual(["file1.txt", "file2.txt"]);
  });

  it("should log and throw on upload failure", async () => {
    const error = new Error("S3 upload failed");
    (service as any).s3.send = jest.fn().mockRejectedValue(error);
    const spy = jest.spyOn((service as any).logger, "error");

    await expect(
      service.uploadFiles([
        {
          bucket: "test-bucket",
          key: "file.txt",
          content: Buffer.from("data"),
        },
      ])
    ).rejects.toThrow("S3 upload failed");

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to upload files to S3"),
      expect.any(String)
    );
  });

  it("should log and throw on download failure", async () => {
    const error = new Error("S3 download failed");
    (service as any).s3.send = jest.fn().mockRejectedValue(error);
    const spy = jest.spyOn((service as any).logger, "error");

    await expect(
      service.downloadFiles([{ bucket: "test-bucket", key: "file.txt" }])
    ).rejects.toThrow("S3 download failed");

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to download files from S3"),
      expect.any(String)
    );
  });

  it("should log and throw on delete failure", async () => {
    const error = new Error("S3 delete failed");
    (service as any).s3.send = jest.fn().mockRejectedValue(error);
    const spy = jest.spyOn((service as any).logger, "error");

    await expect(
      service.deleteFiles([{ bucket: "test-bucket", key: "file.txt" }])
    ).rejects.toThrow("S3 delete failed");

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to delete files from S3"),
      expect.any(String)
    );
  });

  it("should log and throw on list failure", async () => {
    const error = new Error("S3 list failed");
    (service as any).s3.send = jest.fn().mockRejectedValue(error);
    const spy = jest.spyOn((service as any).logger, "error");

    await expect(
      service.listFiles({
        bucket: "test-bucket",
        prefix: "",
      })
    ).rejects.toThrow("S3 list failed");

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to list files from S3"),
      expect.any(String)
    );
  });

  it("should default to application/octet-stream if contentType is not provided", async () => {
    const mockSend = jest.fn().mockResolvedValue({});
    (service as any).s3.send = mockSend;

    await service.uploadFiles([
      {
        bucket: "test-bucket",
        key: "file.txt",
        content: Buffer.from("data"),
        // no contentType provided
      },
    ]);

    const sent = mockSend.mock.calls[0][0];
    expect(sent.input.ContentType).toBe("application/octet-stream");
  });

  it("should default prefix to empty string when not provided", async () => {
    const mockSend = jest.fn().mockResolvedValue({ Contents: [] });
    (service as any).s3.send = mockSend;

    await service.listFiles({ bucket: "test-bucket" });

    const sent = mockSend.mock.calls[0][0];
    expect(sent.input.Prefix).toBe("");
  });

  it("should return empty array if S3 response has no Contents", async () => {
    const mockSend = jest.fn().mockResolvedValue({});
    (service as any).s3.send = mockSend;

    const result = await service.listFiles({ bucket: "test-bucket" });

    expect(result).toEqual([]);
  });

  describe("getSignedUrl", () => {
    it("should generate a signed URL successfully", async () => {
      const fakeUrl = "https://signedurl";
      // Obtenha o mock da função getSignedUrl
      const { getSignedUrl: mockGetSignedUrl } = require("@aws-sdk/s3-request-presigner");
      mockGetSignedUrl.mockResolvedValue(fakeUrl);

      const dto = {
        bucket: "test-bucket",
        key: "file.txt",
        expiresInSeconds: 1800,ClassSerializerInterceptor
      };

      const url = await service.getSignedUrl(dto);

      expect(url).toEqual(fakeUrl);
      // Verifica se a função getSignedUrl foi chamada corretamente
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
      // Primeiro parâmetro: instância do s3 utilizada no serviço
      expect(mockGetSignedUrl.mock.calls[0][0]).toBe((service as any).s3);
      // Segundo parâmetro: comando do GetObject criado com os parâmetros corretos
      const commandArg = mockGetSignedUrl.mock.calls[0][1];
      expect(commandArg.input.Bucket).toEqual(dto.bucket);
      expect(commandArg.input.Key).toEqual(dto.key);
      // Terceiro parâmetro: as opções, onde o expiresIn é passado
      expect(mockGetSignedUrl.mock.calls[0][2]).toEqual({
        expiresIn: dto.expiresInSeconds,
      });
    });

    it("should log error and throw when getSignedUrl fails", async () => {
      const error = new Error("GetSignedUrl failed");
      const { getSignedUrl: mockGetSignedUrl } = require("@aws-sdk/s3-request-presigner");
      mockGetSignedUrl.mockRejectedValue(error);

      const dto = {
        bucket: "test-bucket",
        key: "file.txt",
        expiresIn: 1800,
      };

      const spy = jest.spyOn((service as any).logger, "error");

      await expect(service.getSignedUrl(dto)).rejects.toThrow("GetSignedUrl failed");
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to generate signed URL"),
        expect.any(String)
      );
    });
  });
});
