import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac } from "crypto";
import { createWriteStream, promises as fs } from "fs";
import { resolve, dirname, basename, relative, sep } from "path";
import { pipeline } from "stream/promises";

export interface UploadResult {
  key: string;
  url?: string;
  size: number;
  provider: "s3" | "local";
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly endpoint: string | null;
  private readonly region: string;
  private readonly bucket: string | null;
  private readonly accessKeyId: string | null;
  private readonly secretAccessKey: string | null;
  private readonly publicUrl: string | null;
  private readonly localBaseDir: string;
  private readonly mediaBaseDir: string;
  private readonly apiPublicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = this.config.get<string>("S3_ENDPOINT") || null;
    this.region = this.config.get<string>("S3_REGION", "auto");
    this.bucket = this.config.get<string>("S3_BUCKET") || null;
    this.accessKeyId = this.config.get<string>("S3_ACCESS_KEY_ID") || null;
    this.secretAccessKey =
      this.config.get<string>("S3_SECRET_ACCESS_KEY") || null;
    this.publicUrl = this.config.get<string>("S3_PUBLIC_URL") || null;
    this.localBaseDir = resolve(
      this.config.get<string>("BACKUP_DIR", "./backups"),
    );
    this.mediaBaseDir = resolve(
      this.config.get<string>("MEDIA_STORAGE_DIR", "../../.local-data/media"),
    );
    this.apiPublicUrl = this.config
      .get<string>("API_PUBLIC_URL", `http://localhost:${this.config.get("PORT", 3001)}`)
      .replace(/\/$/, "");

    if (this.isS3Configured()) {
      this.logger.log(
        `✅ Object Storage active: Bucket "${this.bucket}" (Region: ${this.region})`,
      );
    } else {
      this.logger.log(
        `📁 Storage running in Local mode (Base dir: ${this.localBaseDir})`,
      );
    }
  }

  /** Checks if S3 / Cloudflare R2 credentials are fully provided */
  isS3Configured(): boolean {
    return Boolean(
      this.endpoint &&
        this.bucket &&
        this.accessKeyId &&
        this.secretAccessKey,
    );
  }

  /**
   * Uploads a local file to S3/R2 storage (or stores locally if S3 is not configured).
   */
  async uploadFile(
    localFilePath: string,
    storageKey: string,
    contentType = "application/octet-stream",
  ): Promise<UploadResult> {
    const fileStat = await fs.stat(localFilePath);

    if (this.isS3Configured()) {
      try {
        const fileBuffer = await fs.readFile(localFilePath);
        await this.s3Request(
          "PUT",
          storageKey,
          fileBuffer,
          contentType,
        );

        const url = this.publicUrl
          ? `${this.publicUrl.replace(/\/$/, "")}/${storageKey}`
          : undefined;

        this.logger.log(
          `☁️ File uploaded to Object Storage: ${storageKey} (${fileStat.size} bytes)`,
        );

        return {
          key: storageKey,
          url,
          size: fileStat.size,
          provider: "s3",
        };
      } catch (err) {
        this.logger.error(
          `Failed to upload to S3, falling back to local copy: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    // Local storage fallback
    const targetLocalPath = resolve(this.localBaseDir, storageKey);
    await fs.mkdir(dirname(targetLocalPath), { recursive: true });
    if (localFilePath !== targetLocalPath) {
      await fs.copyFile(localFilePath, targetLocalPath);
    }

    return {
      key: storageKey,
      url: `/backups/${basename(targetLocalPath)}`,
      size: fileStat.size,
      provider: "local",
    };
  }

  /** Uploads a generated HLS artifact and returns a browser-playable URL. */
  async uploadMediaFile(
    localFilePath: string,
    storageKey: string,
    contentType: string,
  ): Promise<UploadResult> {
    const cleanKey = storageKey.replace(/^\/+/, "").replace(/^media\//, "");
    const objectKey = `media/${cleanKey}`;
    const fileStat = await fs.stat(localFilePath);

    if (this.isS3Configured()) {
      const fileBuffer = await fs.readFile(localFilePath);
      await this.s3Request("PUT", objectKey, fileBuffer, contentType);
      const cdnBase = this.publicUrl?.replace(/\/$/, "");
      if (!cdnBase) {
        throw new Error("S3_PUBLIC_URL is required for published media");
      }
      return {
        key: objectKey,
        url: `${cdnBase}/${objectKey}`,
        size: fileStat.size,
        provider: "s3",
      };
    }

    const targetLocalPath = resolve(this.mediaBaseDir, cleanKey);
    const escaped = relative(this.mediaBaseDir, targetLocalPath);
    if (escaped.startsWith("..") || escaped.includes(`..${sep}`)) {
      throw new Error("Invalid media storage key");
    }
    await fs.mkdir(dirname(targetLocalPath), { recursive: true });
    if (resolve(localFilePath) !== targetLocalPath) {
      await fs.copyFile(localFilePath, targetLocalPath);
    }
    return {
      key: objectKey,
      url: `${this.apiPublicUrl}/media/${cleanKey.replace(/\\/g, "/")}`,
      size: fileStat.size,
      provider: "local",
    };
  }

  /**
   * Downloads a file from S3/R2 storage to target local path.
   */
  async downloadFile(
    storageKey: string,
    targetLocalPath: string,
  ): Promise<string> {
    await fs.mkdir(dirname(targetLocalPath), { recursive: true });

    if (this.isS3Configured()) {
      const response = await this.s3Request("GET", storageKey);
      if (!response.ok || !response.body) {
        throw new Error(
          `Object storage download failed with status ${response.status}`,
        );
      }

      const fileStream = createWriteStream(targetLocalPath);
      await pipeline(response.body, fileStream);
      this.logger.log(
        `☁️ Downloaded file from Object Storage to ${targetLocalPath}`,
      );
      return targetLocalPath;
    }

    const localSourcePath = resolve(this.localBaseDir, storageKey);
    if (localSourcePath !== targetLocalPath) {
      await fs.copyFile(localSourcePath, targetLocalPath);
    }
    return targetLocalPath;
  }

  /**
   * Deletes a file from S3/R2 or local disk.
   */
  async deleteFile(storageKey: string): Promise<boolean> {
    let success = false;
    if (this.isS3Configured()) {
      try {
        const response = await this.s3Request("DELETE", storageKey);
        success = response.status === 204 || response.status === 200;
      } catch (err) {
        this.logger.warn(`Failed to delete S3 file ${storageKey}: ${err}`);
      }
    }

    const localPath = resolve(this.localBaseDir, storageKey);
    try {
      await fs.unlink(localPath);
      success = true;
    } catch {
      // ignore if local file didn't exist
    }

    return success;
  }

  // ── AWS SigV4 Request Signing Helper ────────────────────────────────────

  private async s3Request(
    method: "GET" | "PUT" | "DELETE" | "HEAD",
    key: string,
    body?: Buffer,
    contentType?: string,
  ): Promise<Response> {
    const rawEndpoint = this.endpoint!.replace(/\/$/, "");
    const hostUrl = new URL(rawEndpoint);
    const bucket = this.bucket!;
    const cleanKey = key.replace(/^\//, "");

    // Path style vs Virtual hosted style URL
    const isVirtualHosted = hostUrl.hostname.includes("r2.cloudflarestorage.com");
    const targetUrl = isVirtualHosted
      ? `${rawEndpoint}/${cleanKey}`
      : `${rawEndpoint}/${bucket}/${cleanKey}`;
    const urlObj = new URL(targetUrl);

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const service = "s3";
    const region = this.region;

    const payloadHash = body
      ? createHash("sha256").update(body).digest("hex")
      : "UNSIGNED-PAYLOAD";

    const canonicalHeaders = [
      `host:${urlObj.host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
      ...(contentType ? [`content-type:${contentType}`] : []),
    ]
      .sort()
      .join("\n") + "\n";

    const signedHeaders = [
      "host",
      "x-amz-content-sha256",
      "x-amz-date",
      ...(contentType ? ["content-type"] : []),
    ]
      .sort()
      .join(";");

    const canonicalRequest = [
      method,
      urlObj.pathname,
      urlObj.search.replace(/^\?/, ""),
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const kDate = createHmac("sha256", `AWS4${this.secretAccessKey!}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(region).digest();
    const kService = createHmac("sha256", kRegion).update(service).digest();
    const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      Host: urlObj.host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: authHeader,
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(body ? { "Content-Length": String(body.length) } : {}),
    };

    return fetch(targetUrl, {
      method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
    });
  }
}
