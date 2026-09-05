import { Injectable } from "@nestjs/common";
import { GetObjectCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class StorageService {
  private readonly credentials = {
    accessKeyId: process.env.MINIO_ROOT_USER ?? "content_factory_local",
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "replace-with-a-long-random-secret"
  };

  private readonly internalClient = new S3Client({
    endpoint: `${process.env.MINIO_USE_SSL === "true" ? "https" : "http"}://${process.env.MINIO_ENDPOINT ?? "localhost"}:${Number(process.env.MINIO_PORT ?? 9000)}`,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: this.credentials
  });

  private readonly publicClient = new S3Client({
    endpoint: process.env.MINIO_PUBLIC_ENDPOINT ?? `${process.env.MINIO_USE_SSL === "true" ? "https" : "http"}://${process.env.MINIO_ENDPOINT ?? "localhost"}:${Number(process.env.MINIO_PORT ?? 9000)}`,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: this.credentials
  });

  async ready(): Promise<void> {
    await this.internalClient.send(new HeadBucketCommand({
      Bucket: process.env.MINIO_OUTPUT_BUCKET ?? "content-factory-output"
    }));
  }

  presignedDownload(bucket: string, objectKey: string): Promise<string> {
    return getSignedUrl(this.publicClient, new GetObjectCommand({ Bucket: bucket, Key: objectKey }), { expiresIn: 15 * 60 });
  }
}
