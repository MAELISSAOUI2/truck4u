import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Storage Service
 *
 * Supports:
 * - Local storage (development)
 * - Cloudflare R2 (production)
 * - AWS S3 (production alternative)
 *
 * Configuration via environment variables:
 * - STORAGE_PROVIDER: 'local' | 'r2' | 's3'
 * - R2_ACCOUNT_ID: Cloudflare account ID
 * - R2_ACCESS_KEY_ID: R2 access key
 * - R2_SECRET_ACCESS_KEY: R2 secret key
 * - R2_BUCKET_NAME: R2 bucket name
 * - R2_PUBLIC_URL: R2 public URL (optional, for public buckets)
 */

interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  isPublic?: boolean;
}

interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

class StorageService {
  private provider: 'local' | 'r2' | 's3';
  private s3Client?: S3Client;
  private bucketName?: string;
  private publicUrl?: string;
  private localBasePath: string;

  constructor() {
    this.provider = (process.env.STORAGE_PROVIDER as any) || 'local';
    this.localBasePath = path.join(process.cwd(), 'uploads');

    if (this.provider === 'r2') {
      this.initR2();
    } else if (this.provider === 's3') {
      this.initS3();
    }
  }

  /**
   * Initialize Cloudflare R2 client
   */
  private initR2() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('⚠️  R2 credentials not configured, falling back to local storage');
      this.provider = 'local';
      return;
    }

    this.bucketName = process.env.R2_BUCKET_NAME || 'truck4u-documents';
    this.publicUrl = process.env.R2_PUBLIC_URL;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    console.log('✅ Cloudflare R2 storage initialized');
  }

  /**
   * Initialize AWS S3 client
   */
  private initS3() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'eu-west-1';

    if (!accessKeyId || !secretAccessKey) {
      console.warn('⚠️  S3 credentials not configured, falling back to local storage');
      this.provider = 'local';
      return;
    }

    this.bucketName = process.env.S3_BUCKET_NAME || 'truck4u-documents';
    this.publicUrl = process.env.S3_PUBLIC_URL;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    console.log('✅ AWS S3 storage initialized');
  }

  /**
   * Generate unique filename
   */
  private generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}${ext}`;
  }

  /**
   * Upload file buffer to storage
   */
  async upload(
    buffer: Buffer,
    originalName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const filename = options.filename || this.generateFilename(originalName);
    const folder = options.folder || 'documents';
    const key = `${folder}/${filename}`;
    const contentType = options.contentType || this.getContentType(originalName);

    if (this.provider === 'local') {
      return this.uploadLocal(buffer, key, contentType);
    } else {
      return this.uploadCloud(buffer, key, contentType, options.isPublic);
    }
  }

  /**
   * Upload to local filesystem
   */
  private async uploadLocal(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<UploadResult> {
    const fullPath = path.join(this.localBasePath, key);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);

    return {
      url: `/uploads/${key}`,
      key,
      size: buffer.length,
      contentType,
    };
  }

  /**
   * Upload to cloud (R2 or S3)
   */
  private async uploadCloud(
    buffer: Buffer,
    key: string,
    contentType: string,
    isPublic: boolean = false
  ): Promise<UploadResult> {
    if (!this.s3Client || !this.bucketName) {
      throw new Error('Cloud storage not initialized');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ...(isPublic && { ACL: 'public-read' }),
    });

    await this.s3Client.send(command);

    // Generate URL
    let url: string;
    if (this.publicUrl) {
      url = `${this.publicUrl}/${key}`;
    } else {
      // Generate presigned URL (valid for 7 days)
      url = await this.getSignedUrl(key, 7 * 24 * 60 * 60);
    }

    return {
      url,
      key,
      size: buffer.length,
      contentType,
    };
  }

  /**
   * Delete file from storage
   */
  async delete(key: string): Promise<void> {
    if (this.provider === 'local') {
      await this.deleteLocal(key);
    } else {
      await this.deleteCloud(key);
    }
  }

  /**
   * Delete from local filesystem
   */
  private async deleteLocal(key: string): Promise<void> {
    try {
      const fullPath = path.join(this.localBasePath, key);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Error deleting local file:', error);
    }
  }

  /**
   * Delete from cloud
   */
  private async deleteCloud(key: string): Promise<void> {
    if (!this.s3Client || !this.bucketName) {
      throw new Error('Cloud storage not initialized');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Get signed URL for private files
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (this.provider === 'local') {
      return `/uploads/${key}`;
    }

    if (!this.s3Client || !this.bucketName) {
      throw new Error('Cloud storage not initialized');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Get content type from filename
   */
  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get current provider
   */
  getProvider(): string {
    return this.provider;
  }
}

// Export singleton instance
export const storageService = new StorageService();
