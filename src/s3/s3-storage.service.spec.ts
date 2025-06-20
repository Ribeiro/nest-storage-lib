import { S3StorageService } from "./s3-storage.service";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Logger } from "@nestjs/common";

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
});

import { Readable } from "stream";
function ReadableFromString(text: string): Readable {
  const stream = new Readable();
  stream.push(text);
  stream.push(null);
  return stream;
}
