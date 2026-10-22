import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Env } from "@/shared/env";

let client: S3Client | undefined;

function s3() {
  const e = r2Env();
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY },
  });
  return client;
}

/** Tests set R2_KEY_PREFIX=test/ so they never touch production objects. */
export function withPrefix(key: string) {
  return `${r2Env().R2_KEY_PREFIX}${key}`;
}

/** Upload links live 15 minutes. A new one is issued per attempt, so a leaked link stops working soon. */
export const PUT_URL_TTL_SECONDS = 900;
/** Playback links live 5 minutes. The player asks again when one runs out. */
export const GET_URL_TTL_SECONDS = 300;

/**
 * Presigned PUT. When `contentLength` is given it is part of the signature, so R2 rejects a body of any other size.
 * Callers should always pass it (the client declares the size and the server caps it first).
 */
export async function signedPutUrl(
  key: string,
  contentType: string,
  opts: { contentLength?: number; expiresIn?: number } = {},
) {
  const cmd = new PutObjectCommand({
    Bucket: r2Env().R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ...(opts.contentLength !== undefined ? { ContentLength: opts.contentLength } : {}),
  });
  return getSignedUrl(s3(), cmd, { expiresIn: opts.expiresIn ?? PUT_URL_TTL_SECONDS });
}

/** `attachment; filename="x"; filename*=UTF-8''x`. Quotes, slashes, control characters and non-ASCII are stripped from the plain name. */
export function attachmentDisposition(name: string): string {
  const clean = name.replace(/[\u0000-\u001f\u007f]/g, "").replace(/[\\/]/g, "_").trim().slice(0, 150) || "download";
  const ascii = clean.replace(/[^\x20-\x7e]/g, "_").replace(/["%;]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}

/**
 * Presigned GET. With `downloadName` the browser saves the file under that name and never renders it
 * (Content-Disposition: attachment), which keeps uploaded files that were stored as octet-stream from running inline.
 */
export async function signedGetUrl(key: string, expiresIn = GET_URL_TTL_SECONDS, downloadName?: string) {
  const cmd = new GetObjectCommand({
    Bucket: r2Env().R2_BUCKET,
    Key: key,
    ...(downloadName ? { ResponseContentDisposition: attachmentDisposition(downloadName) } : {}),
  });
  return getSignedUrl(s3(), cmd, { expiresIn });
}

export async function headObject(key: string): Promise<{ bytes: number; contentType?: string } | null> {
  try {
    const r = await s3().send(new HeadObjectCommand({ Bucket: r2Env().R2_BUCKET, Key: key }));
    return { bytes: r.ContentLength ?? 0, contentType: r.ContentType };
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw err;
  }
}

export async function putObject(key: string, body: Uint8Array | string, contentType: string) {
  await s3().send(new PutObjectCommand({ Bucket: r2Env().R2_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: r2Env().R2_BUCKET, Key: key }));
}

export type ListedObject = { key: string; bytes: number; lastModified: Date };

/** One page of keys under a prefix. Pass the returned `next` to continue. */
export async function listObjects(
  prefix: string,
  opts: { token?: string; max?: number } = {},
): Promise<{ objects: ListedObject[]; next?: string }> {
  const r = await s3().send(
    new ListObjectsV2Command({
      Bucket: r2Env().R2_BUCKET,
      Prefix: prefix,
      ContinuationToken: opts.token,
      MaxKeys: opts.max ?? 1000,
    }),
  );
  return {
    objects: (r.Contents ?? []).flatMap((o) =>
      o.Key ? [{ key: o.Key, bytes: o.Size ?? 0, lastModified: o.LastModified ?? new Date(0) }] : [],
    ),
    next: r.IsTruncated ? r.NextContinuationToken : undefined,
  };
}

export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const r = await s3().send(new GetObjectCommand({ Bucket: r2Env().R2_BUCKET, Key: key }));
  if (!r.Body) throw new Error("Empty object body");
  return r.Body.transformToByteArray();
}
