import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { CreateBucketCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type StoredObject = {
  bucket: string;
  objectKey: string;
  sha256: string;
  mediaType: string;
  byteLength: number;
};

export class ObjectStorage {
  readonly sourceBucket = process.env.MINIO_SOURCE_BUCKET ?? "content-factory-source";
  readonly workBucket = process.env.MINIO_WORK_BUCKET ?? "content-factory-work";
  readonly outputBucket = process.env.MINIO_OUTPUT_BUCKET ?? "content-factory-output";

  private readonly client = new S3Client({
    endpoint: `${process.env.MINIO_USE_SSL === "true" ? "https" : "http"}://${process.env.MINIO_ENDPOINT ?? "localhost"}:${Number(process.env.MINIO_PORT ?? 9000)}`,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ROOT_USER ?? "content_factory_local",
      secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "replace-with-a-long-random-secret"
    }
  });

  async ensureBuckets(): Promise<void> {
    for (const bucket of [this.sourceBucket, this.workBucket, this.outputBucket]) {
      try { await this.client.send(new HeadBucketCommand({ Bucket: bucket })); }
      catch { await this.client.send(new CreateBucketCommand({ Bucket: bucket })); }
    }
  }

  async putBuffer(bucket: string, objectKey: string, buffer: Buffer, mediaType: string): Promise<StoredObject> {
    await this.client.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: buffer, ContentType: mediaType }));
    return { bucket, objectKey, sha256: sha(buffer), mediaType, byteLength: buffer.byteLength };
  }

  async putFile(bucket: string, objectKey: string, path: string, mediaType: string): Promise<StoredObject> {
    const buffer = await readFile(path);
    return this.putBuffer(bucket, objectKey, buffer, mediaType);
  }

  async getFile(bucket: string, objectKey: string, destination: string): Promise<void> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
    if (!response.Body) throw new Error(`Object body missing: ${bucket}/${objectKey}`);
    const stream = response.Body as Readable;
    await pipeline(stream, createWriteStream(destination));
  }
}

function sha(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
