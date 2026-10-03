import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { spawn } from "child_process";
import { promises as fs, existsSync } from "fs";
import { join, resolve } from "path";
import { PrismaService } from "../prisma/prisma.service";

export interface StoryboardJobResult {
  success: boolean;
  movieId: string;
  episodeKey: string;
  vttUrl: string;
  spriteCount: number;
  totalDurationSeconds: number;
  message?: string;
}

export interface StoryboardGenerateOptions {
  movieId: string;
  episodeKey?: string;
  streamUrl?: string;
  intervalSeconds?: number;
  columns?: number;
  rows?: number;
  width?: number;
  height?: number;
  quality?: number;
}

@Injectable()
export class StoryboardService {
  private readonly logger = new Logger(StoryboardService.name);
  private readonly mediaBaseDir: string;
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;
  private readonly apiPublicUrl: string;
  private readonly activeJobs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mediaBaseDir = resolve(
      this.config.get<string>("MEDIA_STORAGE_DIR", "../../.local-data/media"),
    );
    this.ffmpegPath = this.config.get<string>("FFMPEG_PATH", "ffmpeg");
    this.ffprobePath = this.config.get<string>("FFPROBE_PATH", "ffprobe");
    this.apiPublicUrl = this.config
      .get<string>(
        "API_PUBLIC_URL",
        `http://localhost:${this.config.get("PORT", 3001)}`,
      )
      .replace(/\/$/, "");
  }

  /**
   * Returns the public WebVTT URL if a generated storyboard exists for the episode.
   */
  getStoryboardVttUrl(movieId: string, episodeKey: string): string | null {
    const vttFilePath = join(
      this.mediaBaseDir,
      "storyboards",
      movieId,
      episodeKey,
      "thumbnails.vtt",
    );
    if (existsSync(vttFilePath)) {
      return `${this.apiPublicUrl}/media/storyboards/${movieId}/${episodeKey}/thumbnails.vtt`;
    }
    return null;
  }

  /**
   * Generates a high-performance WebP sprite sheet and WebVTT index for video timeline seeking.
   */
  async generateStoryboard(
    options: StoryboardGenerateOptions,
  ): Promise<StoryboardJobResult> {
    const {
      movieId,
      episodeKey = "full",
      intervalSeconds = 5,
      columns = 10,
      rows = 10,
      width = 176,
      height = 99,
      quality = 70,
    } = options;

    const jobKey = `${movieId}:${episodeKey}`;
    if (this.activeJobs.has(jobKey)) {
      throw new Error(`Storyboard cho ${jobKey} đang được xử lý`);
    }

    // Resolve streamUrl if not provided
    let streamUrl = options.streamUrl;
    if (!streamUrl) {
      const source = await this.prisma.moviePlaybackSource.findFirst({
        where: {
          movieId,
          episodeKey,
          streamUrl: { not: null },
        },
        orderBy: { priority: "asc" },
        select: { streamUrl: true },
      });
      if (!source?.streamUrl) {
        throw new NotFoundException(
          `Không tìm thấy streamUrl cho phim ${movieId} tập ${episodeKey}`,
        );
      }
      streamUrl = source.streamUrl;
    }

    const outputDir = join(
      this.mediaBaseDir,
      "storyboards",
      movieId,
      episodeKey,
    );
    await fs.mkdir(outputDir, { recursive: true });

    const vttFile = join(outputDir, "thumbnails.vtt");

    this.activeJobs.add(jobKey);
    this.logger.log(
      `Bắt đầu tạo Storyboard cho ${jobKey} từ stream: ${streamUrl}`,
    );

    try {
      // 1. Probe duration if possible
      const durationSeconds = await this.probeDuration(streamUrl).catch(() => 0);

      // 2. Run FFmpeg to extract frames into WebP sprite sheets
      // Tile = cols x rows (e.g. 10x10 = 100 thumbnails per sheet = 500 seconds per sheet)
      const tileFilter = `fps=1/${intervalSeconds},scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},tile=${columns}x${rows}:padding=0:margin=0`;
      const spritePattern = join(outputDir, "sprite_%03d.webp").replace(/\\/g, "/");

      const ffmpegArgs: string[] = [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-y",
        "-i",
        streamUrl,
        "-an",
        "-vf",
        tileFilter,
        "-fps_mode",
        "vfr",
        "-c:v",
        "libwebp",
        "-quality",
        String(quality),
        "-compression_level",
        "6",
        "-f",
        "image2",
        spritePattern,
      ];

      await this.runCommand(this.ffmpegPath, ffmpegArgs, 15 * 60 * 1000);

      // 3. Scan generated sprite files
      const dirEntries = await fs.readdir(outputDir);
      const spriteFiles = dirEntries
        .filter((f) => /^sprite_\d{3}\.webp$/i.test(f))
        .sort();

      if (spriteFiles.length === 0) {
        throw new Error("FFmpeg không tạo được file sprite nào");
      }

      // 4. Generate WebVTT content
      const framesPerSheet = columns * rows;
      const effectiveDuration =
        durationSeconds > 0
          ? durationSeconds
          : spriteFiles.length * framesPerSheet * intervalSeconds;

      const totalFrames = Math.ceil(effectiveDuration / intervalSeconds);
      const vttContent = this.buildWebVtt({
        totalFrames,
        intervalSeconds,
        columns,
        rows,
        width,
        height,
        spriteFiles,
      });

      await fs.writeFile(vttFile, vttContent, "utf8");

      const vttUrl = `${this.apiPublicUrl}/media/storyboards/${movieId}/${episodeKey}/thumbnails.vtt`;
      this.logger.log(
        `Hoàn tất Storyboard cho ${jobKey}: ${spriteFiles.length} sprites, ${totalFrames} frames -> ${vttUrl}`,
      );

      return {
        success: true,
        movieId,
        episodeKey,
        vttUrl,
        spriteCount: spriteFiles.length,
        totalDurationSeconds: Math.round(effectiveDuration),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Thất bại khi tạo Storyboard cho ${jobKey}: ${message}`);
      throw err;
    } finally {
      this.activeJobs.delete(jobKey);
    }
  }

  /**
   * Generates storyboards for all available episodes of a movie in the background.
   */
  async generateForMovie(
    movieId: string,
  ): Promise<{ queued: number; message: string }> {
    const sources = await this.prisma.moviePlaybackSource.findMany({
      where: {
        movieId,
        streamUrl: { not: null },
      },
      select: {
        episodeKey: true,
        streamUrl: true,
      },
    });

    if (sources.length === 0) {
      throw new NotFoundException(`Không có tập phim nào có streamUrl cho phim ${movieId}`);
    }

    // Dedup episodeKeys
    const uniqueEpisodes = new Map<string, string>();
    for (const s of sources) {
      if (s.streamUrl && !uniqueEpisodes.has(s.episodeKey)) {
        uniqueEpisodes.set(s.episodeKey, s.streamUrl);
      }
    }

    // Process in background queue
    setImmediate(async () => {
      for (const [episodeKey, streamUrl] of uniqueEpisodes.entries()) {
        try {
          await this.generateStoryboard({
            movieId,
            episodeKey,
            streamUrl,
          });
        } catch (error) {
          this.logger.warn(
            `Lỗi background storyboard ${movieId}/${episodeKey}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    });

    return {
      queued: uniqueEpisodes.size,
      message: `Đã đưa ${uniqueEpisodes.size} tập phim vào hàng đợi tạo Storyboard Tua Nhanh 0ms`,
    };
  }

  /**
   * Builds the WebVTT file content referencing sprite coordinates.
   */
  private buildWebVtt(params: {
    totalFrames: number;
    intervalSeconds: number;
    columns: number;
    rows: number;
    width: number;
    height: number;
    spriteFiles: string[];
  }): string {
    const {
      totalFrames,
      intervalSeconds,
      columns,
      rows,
      width,
      height,
      spriteFiles,
    } = params;
    const framesPerSheet = columns * rows;

    const lines: string[] = ["WEBVTT", ""];

    for (let i = 0; i < totalFrames; i++) {
      const sheetIndex = Math.floor(i / framesPerSheet);
      if (sheetIndex >= spriteFiles.length) break;

      const spriteFileName = spriteFiles[sheetIndex];
      const indexInSheet = i % framesPerSheet;
      const col = indexInSheet % columns;
      const row = Math.floor(indexInSheet / columns);

      const x = col * width;
      const y = row * height;

      const startTime = this.formatVttTime(i * intervalSeconds);
      const endTime = this.formatVttTime((i + 1) * intervalSeconds);

      lines.push(`${startTime} --> ${endTime}`);
      lines.push(`${spriteFileName}#xywh=${x},${y},${width},${height}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  private formatVttTime(totalSeconds: number): string {
    const s = Math.max(0, totalSeconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 1000);

    const pad = (n: number, z = 2) => String(n).padStart(z, "0");
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
  }

  private async probeDuration(streamUrl: string): Promise<number> {
    const output = await this.runCommand(
      this.ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        streamUrl,
      ],
      30_000,
    );
    const duration = parseFloat(output.trim());
    return Number.isFinite(duration) ? duration : 0;
  }

  private runCommand(
    command: string,
    args: string[],
    timeoutMs: number,
  ): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn(command, args, { windowsHide: true });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`${command} vượt quá thời gian xử lý (${timeoutMs}ms)`));
      }, timeoutMs);

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr = `${stderr}${chunk.toString("utf8")}`.slice(-4000);
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(new Error(`${command} không thể khởi chạy: ${error.message}`));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolvePromise(stdout);
        else reject(new Error(`${command} thất bại (${code}): ${stderr.trim()}`));
      });
    });
  }
}
