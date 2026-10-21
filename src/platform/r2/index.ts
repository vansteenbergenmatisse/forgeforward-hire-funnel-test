import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/shared/env";

let client: S3Client | undefined;

function s3() {
  const e = env();
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY },
  });
  return client;
}

/** Tests set R2_KEY_PREFIX=test/ so they never touch production objects. */
export function withPrefix(key: string) {
  return `${env().R2_KEY_PREFIX}${key}`;
}

export async function signedPutUrl(key: string, contentType: string, expiresIn = 3600) {
  const cmd = new PutObjectCommand({ Bucket: env().R2_BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3(), cmd, { expiresIn });
}

export async function signedGetUrl(key: string, expiresIn = 3600) {
  const cmd = new GetObjectCommand({ Bucket: env().R2_BUCKET, Key: key });
  return getSignedUrl(s3(), cmd, { expiresIn });
}

export async function headObject(key: string): Promise<{ bytes: number; contentType?: string } | null> {
  try {
    const r = await s3().send(new HeadObjectCommand({ Bucket: env().R2_BUCKET, Key: key }));
    return { bytes: r.ContentLength ?? 0, contentType: r.ContentType };
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw err;
  }
}

export async function putObject(key: string, body: Uint8Array | string, contentType: string) {
  await s3().send(new PutObjectCommand({ Bucket: env().R2_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: env().R2_BUCKET, Key: key }));
}
