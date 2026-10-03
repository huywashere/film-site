import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { promises as fs } from "fs";
import { join, resolve } from "path";
import { randomUUID } from "crypto";

@Injectable()
export class SubtitlesService {
  private readonly logger = new Logger(SubtitlesService.name);
  private readonly subtitlesDir: string;

  constructor(private readonly config: ConfigService) {
    const mediaDir = resolve(
      this.config.get<string>("MEDIA_STORAGE_DIR", "../../.local-data/media"),
    );
    this.subtitlesDir = join(mediaDir, "subtitles");
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.subtitlesDir, { recursive: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to create subtitles directory: ${msg}`);
    }
  }

  /**
   * Convert SRT content to standard WebVTT format
   */
  convertSrtToVtt(srtContent: string): string {
    // Strip UTF-8 BOM if present
    let content = srtContent.replace(/^\uFEFF/, "");

    // Normalize newlines to \n
    content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Replace comma in timestamps: 00:01:23,456 --> 00:01:25,789 to 00:01:23.456 --> 00:01:25.789
    const converted = content.replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
      "$1.$2",
    );

    // If already has WEBVTT header, return converted content
    if (/^WEBVTT\b/i.test(converted.trim())) {
      return converted.trim() + "\n";
    }

    return "WEBVTT\n\n" + converted.trim() + "\n";
  }

  /**
   * Save uploaded subtitle buffer (SRT or VTT) and return WebVTT storage path
   */
  async saveSubtitleFile(
    fileBuffer: Buffer,
    originalName: string,
  ): Promise<{ filename: string; vttContent: string; size: number }> {
    await this.ensureDirectoryExists();

    const isSrt = originalName.toLowerCase().endsWith(".srt");
    const rawContent = fileBuffer.toString("utf-8");

    const vttContent = isSrt ? this.convertSrtToVtt(rawContent) : rawContent;
    const filename = `${randomUUID()}.vtt`;
    const targetPath = join(this.subtitlesDir, filename);

    await fs.writeFile(targetPath, vttContent, "utf-8");

    return {
      filename,
      vttContent,
      size: Buffer.byteLength(vttContent, "utf-8"),
    };
  }

  /**
   * Retrieve WebVTT file content by filename
   */
  async getSubtitleContent(filename: string): Promise<string> {
    // Prevent path traversal
    const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, "");
    if (!safeFilename.endsWith(".vtt")) {
      throw new NotFoundException("Invalid subtitle file format");
    }

    const filePath = join(this.subtitlesDir, safeFilename);
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch {
      throw new NotFoundException(`Subtitle file ${safeFilename} not found`);
    }
  }
}
