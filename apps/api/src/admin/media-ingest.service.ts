import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MediaUploadStatus } from "@prisma/client";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { extname, join, relative, resolve } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../common/storage/storage.service";
import { CreateMediaUploadDto } from "./media-upload.dto";

type AdminActor = { uid?: string; id?: string; email?: string };
type ProbeResult = { width: number; height: number; duration: number };
type Rendition = {
  name: string;
  height: number;
  bandwidth: number;
  maxrate: string;
  bufsize: string;
};

const CONTENT_TYPES: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".m4s": "video/iso.segment",
  ".vtt": "text/vtt",
};

@Injectable()
export class MediaIngestService implements OnModuleInit {
  private readonly logger = new Logger(MediaIngestService.name);
  private readonly active = new Set<string>();
  private readonly pending: string[] = [];
  private readonly outputDir: string;
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;
  private readonly concurrency: number;
  private readonly ffmpegThreads: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.outputDir = resolve(
      config.get<string>("MEDIA_TRANSCODE_DIR", "../../.local-data/transcode"),
    );
    this.ffmpegPath = config.get<string>("FFMPEG_PATH", "ffmpeg");
    this.ffprobePath = config.get<string>("FFPROBE_PATH", "ffprobe");
    this.concurrency = Math.min(
      Math.max(Number(config.get("MEDIA_TRANSCODE_CONCURRENCY", 1)) || 1, 1),
      4,
    );
    this.ffmpegThreads = Math.min(
      Math.max(Number(config.get("MEDIA_TRANSCODE_THREADS", 2)) || 2, 1),
      8,
    );
  }

  async onModuleInit() {
    await this.prisma.mediaUploadJob.updateMany({
      where: { status: MediaUploadStatus.PROCESSING },
      data: { status: MediaUploadStatus.QUEUED, progress: 0 },
    });
    const pending = await this.prisma.mediaUploadJob.findMany({
      where: { status: MediaUploadStatus.QUEUED },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true },
    });
    for (const job of pending) this.enqueue(job.id);
  }

  async createJob(file: Express.Multer.File | undefined, dto: CreateMediaUploadDto, actor: AdminActor) {
    if (!file) throw new BadRequestException("Chưa chọn tệp video");
    const movie = await this.prisma.movie.findUnique({
      where: { id: dto.movieId },
      select: { id: true, sources: true, playbackSources: { take: 1, select: { id: true } } },
    });
    if (!movie) {
      await fs.unlink(file.path).catch(() => undefined);
      throw new NotFoundException("Không tìm thấy phim để gắn nguồn video");
    }

    const job = await this.prisma.$transaction(async (tx) => {
      if (movie.playbackSources.length === 0) {
        await tx.movie.update({ where: { id: movie.id }, data: { isHidden: true } });
      }
      return tx.mediaUploadJob.create({
        data: {
          movieId: movie.id,
          episodeKey: dto.episodeKey || "full",
          episodeName: dto.episodeName?.trim() || undefined,
          serverName: dto.serverName?.trim() || "FlexPhim",
          sourcePath: resolve(file.path),
          requestedBy: actor.email || actor.uid || actor.id || "admin",
        },
      });
    });
    this.enqueue(job.id);
    return job;
  }

  listJobs(movieId?: string) {
    return this.prisma.mediaUploadJob.findMany({
      where: movieId ? { movieId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        movieId: true,
        episodeKey: true,
        episodeName: true,
        serverName: true,
        status: true,
        progress: true,
        manifestUrl: true,
        durationSeconds: true,
        sourceWidth: true,
        sourceHeight: true,
        errorMessage: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
      },
    });
  }

  private enqueue(id: string) {
    if (this.active.has(id) || this.pending.includes(id)) return;
    this.pending.push(id);
    this.pump();
  }

  private pump() {
    while (this.active.size < this.concurrency && this.pending.length > 0) {
      const id = this.pending.shift()!;
      this.active.add(id);
      setImmediate(() => {
        void this.process(id).finally(() => {
          this.active.delete(id);
          this.pump();
        });
      });
    }
  }

  private async process(id: string) {
    const job = await this.prisma.mediaUploadJob.findUnique({
      where: { id },
      include: { movie: { select: { sources: true } } },
    });
    if (!job || job.status !== MediaUploadStatus.QUEUED) return;
    const jobDir = join(this.outputDir, id);
    try {
      await this.prisma.mediaUploadJob.update({
        where: { id },
        data: { status: MediaUploadStatus.PROCESSING, startedAt: new Date(), progress: 2, errorMessage: null },
      });
      await fs.mkdir(jobDir, { recursive: true });
      const probe = await this.probe(job.sourcePath);
      await this.prisma.mediaUploadJob.update({
        where: { id },
        data: {
          sourceWidth: probe.width,
          sourceHeight: probe.height,
          durationSeconds: Math.max(1, Math.round(probe.duration)),
          progress: 8,
        },
      });

      const renditions = this.renditionsFor(probe.height);
      for (let index = 0; index < renditions.length; index += 1) {
        await this.transcode(job.sourcePath, jobDir, renditions[index]);
        await this.prisma.mediaUploadJob.update({
          where: { id },
          data: { progress: 10 + Math.round(((index + 1) / renditions.length) * 65) },
        });
      }
      await this.writeMasterPlaylist(jobDir, renditions);

      const files = await this.walk(jobDir);
      const baseKey = `${job.movieId}/${job.episodeKey}/${id}`;
      let manifestUrl = "";
      const ordered = files.sort((a, b) => Number(a.endsWith("master.m3u8")) - Number(b.endsWith("master.m3u8")));
      for (let index = 0; index < ordered.length; index += 1) {
        const file = ordered[index];
        const relativePath = relative(jobDir, file).replace(/\\/g, "/");
        const uploaded = await this.storage.uploadMediaFile(
          file,
          `${baseKey}/${relativePath}`,
          CONTENT_TYPES[extname(file).toLowerCase()] || "application/octet-stream",
        );
        if (relativePath === "master.m3u8") manifestUrl = uploaded.url || "";
        await this.prisma.mediaUploadJob.update({
          where: { id },
          data: { progress: 76 + Math.round(((index + 1) / ordered.length) * 22) },
        });
      }
      if (!manifestUrl) throw new Error("Không tạo được URL master playlist");

      await this.prisma.$transaction([
        this.prisma.moviePlaybackSource.upsert({
          where: {
            movieId_provider_providerSlug_episodeKey_serverName: {
              movieId: job.movieId,
              provider: "custom",
              providerSlug: job.movieId,
              episodeKey: job.episodeKey,
              serverName: job.serverName,
            },
          },
          create: {
            movieId: job.movieId,
            provider: "custom",
            providerSlug: job.movieId,
            episodeKey: job.episodeKey,
            episodeName: job.episodeName,
            serverName: job.serverName,
            streamUrl: manifestUrl,
            priority: 100,
            healthStatus: "operational",
            lastCheckedAt: new Date(),
          },
          update: {
            episodeName: job.episodeName,
            streamUrl: manifestUrl,
            healthStatus: "operational",
            lastCheckedAt: new Date(),
            lastError: null,
          },
        }),
        this.prisma.movie.update({
          where: { id: job.movieId },
          data: {
            isHidden: false,
            sources: [...new Set([...job.movie.sources, "manual", "self-upload"])],
          },
        }),
        this.prisma.mediaUploadJob.update({
          where: { id },
          data: {
            status: MediaUploadStatus.COMPLETED,
            progress: 100,
            outputKey: `media/${baseKey}`,
            manifestUrl,
            finishedAt: new Date(),
          },
        }),
      ]);
      this.logger.log(`Published uploaded media ${id} for ${job.movieId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Media upload ${id} failed: ${message}`);
      await this.prisma.mediaUploadJob.update({
        where: { id },
        data: {
          status: MediaUploadStatus.FAILED,
          errorMessage: message.slice(0, 4000),
          finishedAt: new Date(),
        },
      }).catch(() => undefined);
    } finally {
      await fs.rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
      await fs.unlink(job.sourcePath).catch(() => undefined);
    }
  }

  private renditionsFor(sourceHeight: number): Rendition[] {
    const presets: Rendition[] = [
      { name: "1080p", height: 1080, bandwidth: 5_800_000, maxrate: "5000k", bufsize: "10000k" },
      { name: "720p", height: 720, bandwidth: 3_000_000, maxrate: "2600k", bufsize: "5200k" },
      { name: "480p", height: 480, bandwidth: 1_250_000, maxrate: "1000k", bufsize: "2000k" },
    ];
    const eligible = presets.filter((item) => item.height <= sourceHeight);
    return eligible.length ? eligible : [{ name: `${sourceHeight}p`, height: sourceHeight, bandwidth: 800_000, maxrate: "650k", bufsize: "1300k" }];
  }

  private async probe(sourcePath: string): Promise<ProbeResult> {
    const output = await this.run(this.ffprobePath, [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height:format=duration",
      "-of", "json",
      sourcePath,
    ], 60_000);
    const parsed = JSON.parse(output) as {
      streams?: Array<{ width?: number; height?: number }>;
      format?: { duration?: string };
    };
    const stream = parsed.streams?.[0];
    const duration = Number(parsed.format?.duration);
    if (!stream?.width || !stream.height || !Number.isFinite(duration)) {
      throw new Error("FFprobe không đọc được thông tin video");
    }
    return { width: stream.width, height: stream.height, duration };
  }

  private async transcode(sourcePath: string, jobDir: string, rendition: Rendition) {
    const targetDir = join(jobDir, rendition.name);
    await fs.mkdir(targetDir, { recursive: true });
    await this.run(this.ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-y", "-i", sourcePath,
      "-map", "0:v:0", "-map", "0:a:0?",
      "-vf", `scale=-2:${rendition.height}`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
      "-threads", String(this.ffmpegThreads),
      "-maxrate", rendition.maxrate, "-bufsize", rendition.bufsize,
      "-g", "144", "-keyint_min", "144", "-sc_threshold", "0",
      "-c:a", "aac", "-b:a", "128k", "-ac", "2",
      "-f", "hls", "-hls_time", "6", "-hls_playlist_type", "vod",
      "-hls_flags", "independent_segments",
      "-hls_segment_filename", join(targetDir, "segment_%06d.ts"),
      join(targetDir, "index.m3u8"),
    ], 6 * 60 * 60_000);
  }

  private async writeMasterPlaylist(jobDir: string, renditions: Rendition[]) {
    const lines = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-INDEPENDENT-SEGMENTS"];
    for (const item of renditions) {
      const width = Math.round((item.height * 16) / 9 / 2) * 2;
      lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${item.bandwidth},RESOLUTION=${width}x${item.height}`);
      lines.push(`${item.name}/index.m3u8`);
    }
    await fs.writeFile(join(jobDir, "master.m3u8"), `${lines.join("\n")}\n`, "utf8");
  }

  private async walk(directory: string): Promise<string[]> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? this.walk(path) : Promise.resolve([path]);
    }));
    return nested.flat();
  }

  private run(command: string, args: string[], timeoutMs: number): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn(command, args, { windowsHide: true });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`${command} vượt quá thời gian xử lý`));
      }, timeoutMs);
      child.stdout.on("data", (chunk) => { stdout += String(chunk); });
      child.stderr.on("data", (chunk) => { stderr = `${stderr}${String(chunk)}`.slice(-8000); });
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(new Error(`${command} không khởi chạy được: ${error.message}`));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolvePromise(stdout);
        else reject(new Error(`${command} thất bại (${code}): ${stderr.trim()}`));
      });
    });
  }
}
