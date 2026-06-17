import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

type FileTypeModule = typeof import('file-type');

let fileTypeModulePromise: Promise<FileTypeModule> | null = null;

function loadFileTypeModule(): Promise<FileTypeModule> {
  if (!fileTypeModulePromise) {
    // Preserve a real runtime dynamic import so CommonJS Jest doesn't rewrite
    // this ESM-only dependency to require().
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const importModule = new Function(
      'specifier',
      'return import(specifier)',
    ) as (specifier: string) => Promise<FileTypeModule>;
    fileTypeModulePromise = importModule('file-type');
  }

  return fileTypeModulePromise;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly endpoint = process.env.S3_ENDPOINT ?? '';
  private readonly region = process.env.S3_REGION ?? 'us-east-1';
  private readonly bucket = process.env.S3_BUCKET ?? '';
  private readonly accessKeyId = process.env.S3_ACCESS_KEY_ID ?? '';
  private readonly secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? '';
  private readonly publicBaseUrl =
    process.env.S3_PUBLIC_BASE_URL ?? this.defaultPublicBaseUrl();

  private readonly client = new S3Client({
    region: this.region,
    endpoint: this.endpoint || undefined,
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    credentials:
      this.accessKeyId && this.secretAccessKey
        ? {
            accessKeyId: this.accessKeyId,
            secretAccessKey: this.secretAccessKey,
          }
        : undefined,
  });

  private bucketReady = false;

  async uploadBuffer(params: {
    folder: string;
    originalName: string;
    contentType: string;
    body: Buffer;
    extension?: string;
    allowedMimeTypes?: string[];
  }): Promise<{ key: string; url: string }> {
    this.ensureConfigured();
    await this.ensureBucketExists();

    if (params.allowedMimeTypes?.length) {
      const { fileTypeFromBuffer } = await loadFileTypeModule();
      const detected = await fileTypeFromBuffer(params.body);
      if (!detected || !params.allowedMimeTypes.includes(detected.mime)) {
        throw new BadRequestException(
          `Invalid file type. Allowed: ${params.allowedMimeTypes.join(', ')}`,
        );
      }
    }

    const key = this.buildObjectKey(
      params.folder,
      params.originalName,
      params.extension,
    );

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );

    return {
      key,
      url: this.proxyPath(key),
    };
  }

  async uploadText(params: {
    folder: string;
    filename: string;
    contentType: string;
    body: string;
  }): Promise<{ key: string; url: string }> {
    this.ensureConfigured();
    await this.ensureBucketExists();

    const key = `${this.cleanSegment(params.folder)}/${params.filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );

    return {
      key,
      url: this.proxyPath(key),
    };
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    this.ensureConfigured();

    return getSignedUrl(
      this.client as any,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }) as any,
      { expiresIn: expiresInSeconds },
    );
  }

  async deleteByUrl(url: string | null | undefined): Promise<void> {
    if (!url) {
      return;
    }

    const key = this.extractKey(url);
    if (!key) {
      return;
    }

    await this.deleteByKey(key);
  }

  async deleteByKey(key: string | null | undefined): Promise<void> {
    if (!key) {
      return;
    }

    if (!this.isConfigured()) {
      return;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to delete object ${key}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error(
        'S3 storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.',
      );
    }
  }

  private isConfigured(): boolean {
    return !!(
      this.endpoint &&
      this.bucket &&
      this.accessKeyId &&
      this.secretAccessKey
    );
  }

  private async ensureBucketExists(): Promise<void> {
    if (this.bucketReady) {
      return;
    }

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.bucketReady = true;
      return;
    } catch {
      // Create when missing; harmless if another worker creates concurrently.
    }

    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.bucketReady = true;
      this.logger.log(`Created S3 bucket: ${this.bucket}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('BucketAlreadyOwnedByYou')) {
        throw error;
      }
      this.bucketReady = true;
    }
  }

  private buildObjectKey(
    folder: string,
    originalName: string,
    extension?: string,
  ): string {
    const ext = extension ?? this.fileExtensionFromName(originalName);
    const suffix = ext ? `.${ext}` : '';
    return `${this.cleanSegment(folder)}/${randomUUID()}${suffix}`;
  }

  private fileExtensionFromName(name: string): string {
    const dot = name.lastIndexOf('.');
    if (dot < 0 || dot === name.length - 1) {
      return '';
    }
    return name.slice(dot + 1).toLowerCase();
  }

  private objectUrl(key: string): string {
    const base = this.publicBaseUrl.replace(/\/$/, '');
    return `${base}/${this.bucket}/${key}`;
  }

  private defaultPublicBaseUrl(): string {
    const endpoint = this.endpoint.trim().replace(/\/$/, '');
    return endpoint || 'http://localhost:9000';
  }

  private cleanSegment(value: string): string {
    return value.replace(/^\/+|\/+$/g, '');
  }

  /**
   * Return a readable stream + content type for an S3 object.
   */
  async getObject(
    key: string,
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
    this.ensureConfigured();

    const { GetObjectCommand: Cmd } = await import('@aws-sdk/client-s3');
    const res = await this.client.send(
      new Cmd({ Bucket: this.bucket, Key: key }),
    );

    return {
      stream: res.Body as NodeJS.ReadableStream,
      contentType: res.ContentType ?? 'application/octet-stream',
    };
  }

  /**
   * Build a server-relative proxy path for an S3 object key.
   * Returns `/v1/media/file/{key}` — usable on any frontend origin.
   */
  proxyPath(key: string): string {
    return `/v1/media/file/${encodeURI(key)}`;
  }

  /**
   * Resolve a stored media reference (bare S3 key, proxy path, or legacy
   * full URL) to a server-relative proxy path.
   */
  resolveUrl(keyOrUrl: string | null | undefined): string | null {
    if (!keyOrUrl || !this.isConfigured()) return null;

    // Already a proxy path — return as-is
    if (keyOrUrl.startsWith('/v1/media/file/')) return keyOrUrl;

    const key = this.extractKey(keyOrUrl);
    if (!key) return null;

    return this.proxyPath(key);
  }

  /**
   * Extract the S3 key from a stored value — handles proxy paths
   * (`/v1/media/file/...`), bare keys (e.g. "avatars/uuid.jpg"),
   * and legacy full URLs.
   */
  extractKey(keyOrUrl: string | null | undefined): string | null {
    if (!keyOrUrl) return null;

    // Proxy path → strip prefix to get the key
    const proxyPrefix = '/v1/media/file/';
    if (keyOrUrl.startsWith(proxyPrefix)) {
      return decodeURI(keyOrUrl.slice(proxyPrefix.length)) || null;
    }

    // If it looks like a full URL, parse out the key
    if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
      return this.getKeyFromUrl(keyOrUrl);
    }

    // Already a bare key
    return keyOrUrl;
  }

  private getKeyFromUrl(url: string): string | null {
    // Strip query string (e.g. pre-signed URL params) before matching
    const clean = url.split('?')[0];

    // Try matching against the configured public base URL first
    const normalizedBase = this.publicBaseUrl.replace(/\/$/, '');
    const expectedPrefix = `${normalizedBase}/${this.bucket}/`;
    if (clean.startsWith(expectedPrefix)) {
      return clean.slice(expectedPrefix.length) || null;
    }

    // Fallback: look for the bucket name anywhere in the URL path.
    // This handles URLs stored with a different S3 domain (e.g. DB has
    // s3.varaperformance.com but local config points to SeaweedFS).
    try {
      const parsed = new URL(clean);
      const bucketPrefix = `/${this.bucket}/`;
      const idx = parsed.pathname.indexOf(bucketPrefix);
      if (idx !== -1) {
        return parsed.pathname.slice(idx + bucketPrefix.length) || null;
      }
    } catch {
      // not a valid URL
    }

    return null;
  }
}
