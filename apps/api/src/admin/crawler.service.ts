import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CrawlEpisodeItem {
  name: string;
  slug: string;
  serverName: string;
  streamUrl: string;
  embedUrl?: string;
}

export interface CrawlMovieResult {
  slug: string;
  title: string;
  originName?: string;
  year?: number;
  type: string;
  status?: string;
  totalEpisodes?: number;
  quality?: string;
  language?: string;
  posterUrl?: string;
  thumbUrl?: string;
  description?: string;
  genres: string[];
  countries: string[];
  actors: string[];
  directors: string[];
  trailerUrl?: string;
  episodes: CrawlEpisodeItem[];
  provider: string;
}

export interface CrawlerJob {
  id: string;
  provider: string;
  category: string;
  startPage: number;
  endPage: number;
  currentPage: number;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  deep: boolean;
  totalMoviesFound: number;
  moviesProcessed: number;
  moviesCreated: number;
  moviesUpdated: number;
  episodesImported: number;
  errors: string[];
  logs: string[];
  startedAt: Date;
  finishedAt?: Date;
  cancelled?: boolean;
}

function extractNames(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (typeof item === "object" && item !== null && "name" in item) {
        const val = (item as { name?: unknown }).name;
        return typeof val === "string" ? val.trim() : "";
      }
      return String(item || "").trim();
    })
    .filter(Boolean);
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly jobs = new Map<string, CrawlerJob>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to decode HTML entities and strip unwanted HTML tags from raw descriptions
   */
  private cleanDescription(html?: string | null): string {
    if (!html) return "";
    const clean = String(html)
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&apos;|&#39;|&#039;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&hellip;/g, "…")
      .replace(/&ndash;/g, "–")
      .replace(/&mdash;/g, "—");
    return clean.replace(/\n{3,}/g, "\n\n").trim();
  }

  /**
   * Normalizes image URLs across multiple providers
   */
  private normalizeImageUrl(rawUrl: string | undefined | null, provider: string): string | undefined {
    if (!rawUrl) return undefined;
    const trimmed = rawUrl.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    if (provider === "kkphim") {
      return `https://phimimg.com/${trimmed.replace(/^\/+/, "")}`;
    }
    if (provider === "ophim") {
      return `https://img.ophim.live/uploads/movies/${trimmed.replace(/^\/+/, "")}`;
    }
    return trimmed;
  }

  /**
   * Parse slug and provider from raw string or URL
   */
  public parseInput(input: string, explicitProvider?: string): { slug: string; provider: string } {
    const raw = (input || "").trim();
    if (!raw) throw new Error("Vui lòng nhập slug hoặc đường dẫn phim");

    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        if (parsed.hostname.includes("phimapi.com") || parsed.hostname.includes("kkphim")) {
          const parts = parsed.pathname.split("/").filter(Boolean);
          const slug = parts[parts.length - 1];
          return { slug, provider: explicitProvider || "kkphim" };
        }
        if (parsed.hostname.includes("ophim")) {
          const parts = parsed.pathname.split("/").filter(Boolean);
          const slug = parts[parts.length - 1];
          return { slug, provider: explicitProvider || "ophim" };
        }
        if (parsed.hostname.includes("nguonc.com")) {
          const parts = parsed.pathname.split("/").filter(Boolean);
          const slug = parts[parts.length - 1];
          return { slug, provider: explicitProvider || "nguonc" };
        }
      } catch {
        // Fall through to plain slug
      }
    }

    const slug = raw.replace(/^https?:\/\/[^/]+\//i, "").replace(/^phim\//i, "").replace(/\/+$/, "");
    return {
      slug,
      provider: explicitProvider || "kkphim",
    };
  }

  /**
   * Deeply fetch and parse movie detail from specified provider
   */
  public async fetchDetail(provider: string, slug: string): Promise<CrawlMovieResult> {
    if (provider === "kkphim") {
      return this.fetchKKPhimDetail(slug);
    }
    if (provider === "nguonc") {
      return this.fetchNguonCDetail(slug);
    }
    if (provider === "ophim") {
      return this.fetchOPhimDetail(slug);
    }
    throw new Error(`Nhà cung cấp '${provider}' chưa được hỗ trợ`);
  }

  private async fetchKKPhimDetail(slug: string): Promise<CrawlMovieResult> {
    const url = `https://phimapi.com/phim/${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FlexPhim-Crawler/2.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new Error(`KKPhim trả về HTTP ${res.status} cho slug '${slug}'`);
    }
    const data = (await res.json()) as Record<string, unknown>;
    if (!data.status || !data.movie || typeof data.movie !== "object") {
      throw new Error(String(data.msg || `Không tìm thấy phim trên KKPhim với slug '${slug}'`));
    }
    const m = data.movie as Record<string, unknown>;
    const episodes: CrawlEpisodeItem[] = [];

    if (Array.isArray(data.episodes)) {
      for (const server of data.episodes) {
        if (typeof server !== "object" || server === null) continue;
        const s = server as Record<string, unknown>;
        const sName = String(s.server_name || "Server VIP").trim();
        if (Array.isArray(s.server_data)) {
          for (const item of s.server_data) {
            if (typeof item !== "object" || item === null) continue;
            const it = item as Record<string, unknown>;
            const streamUrl = String(it.link_m3u8 || it.link_embed || "").trim();
            if (!streamUrl) continue;
            episodes.push({
              name: String(it.name || "Full").trim(),
              slug: String(it.slug || `tap-${String(it.name || 1)}`).trim(),
              serverName: sName,
              streamUrl,
              embedUrl: it.link_embed ? String(it.link_embed).trim() : undefined,
            });
          }
        }
      }
    }

    const rawYear = Number(m.year);
    const parsedTotal = parseInt(String(m.episode_total || "").replace(/\D/g, ""), 10);

    return {
      slug: String(m.slug || slug).trim(),
      title: String(m.name || m.title || slug).trim(),
      originName: m.origin_name ? String(m.origin_name).trim() : undefined,
      year: Number.isFinite(rawYear) && rawYear > 0 ? Math.trunc(rawYear) : undefined,
      type: String(m.type || "single").trim(),
      status: String(m.status || "completed").trim(),
      totalEpisodes: Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : undefined,
      quality: m.quality ? String(m.quality).trim() : "HD",
      language: m.lang ? String(m.lang).trim() : "Vietsub",
      posterUrl: this.normalizeImageUrl(typeof m.poster_url === "string" ? m.poster_url : undefined, "kkphim"),
      thumbUrl: this.normalizeImageUrl(typeof m.thumb_url === "string" ? m.thumb_url : undefined, "kkphim"),
      description: this.cleanDescription(typeof m.content === "string" ? m.content : undefined),
      genres: extractNames(m.category),
      countries: extractNames(m.country),
      actors: extractNames(m.actor),
      directors: extractNames(m.director),
      trailerUrl: typeof m.trailer_url === "string" ? m.trailer_url.trim() : undefined,
      episodes,
      provider: "kkphim",
    };
  }

  private async fetchNguonCDetail(slug: string): Promise<CrawlMovieResult> {
    const url = `https://phim.nguonc.com/api/film/${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FlexPhim-Crawler/2.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new Error(`NguonC trả về HTTP ${res.status} cho slug '${slug}'`);
    }
    const data = (await res.json()) as Record<string, unknown>;
    if (data.status !== "success" || !data.movie || typeof data.movie !== "object") {
      throw new Error(String(data.message || `Không tìm thấy phim trên NguonC với slug '${slug}'`));
    }
    const m = data.movie as Record<string, unknown>;
    const episodes: CrawlEpisodeItem[] = [];

    if (Array.isArray(m.episodes)) {
      for (const server of m.episodes) {
        if (typeof server !== "object" || server === null) continue;
        const s = server as Record<string, unknown>;
        const sName = String(s.server_name || "NguonC Server").trim();
        if (Array.isArray(s.items)) {
          for (const item of s.items) {
            if (typeof item !== "object" || item === null) continue;
            const it = item as Record<string, unknown>;
            const streamUrl = String(it.m3u8 || it.embed || "").trim();
            if (!streamUrl) continue;
            episodes.push({
              name: String(it.name || "Full").trim(),
              slug: String(it.slug || `tap-${String(it.name || 1)}`).trim(),
              serverName: sName,
              streamUrl,
              embedUrl: it.embed ? String(it.embed).trim() : undefined,
            });
          }
        }
      }
    }

    const rawYear = Number(m.year);
    const parsedTotal = parseInt(String(m.total_episodes || "").replace(/\D/g, ""), 10);

    return {
      slug: String(m.slug || slug).trim(),
      title: String(m.name || slug).trim(),
      originName: m.original_name ? String(m.original_name).trim() : undefined,
      year: Number.isFinite(rawYear) && rawYear > 0 ? Math.trunc(rawYear) : undefined,
      type: String(m.type || "single").trim(),
      status: String(m.status || "completed").trim(),
      totalEpisodes: Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : undefined,
      quality: m.quality ? String(m.quality).trim() : "HD",
      language: m.language ? String(m.language).trim() : "Vietsub",
      posterUrl: this.normalizeImageUrl(typeof m.poster_url === "string" ? m.poster_url : undefined, "nguonc"),
      thumbUrl: this.normalizeImageUrl(typeof m.thumb_url === "string" ? m.thumb_url : undefined, "nguonc"),
      description: this.cleanDescription(typeof m.description === "string" ? m.description : undefined),
      genres: extractNames(m.category || m.categories),
      countries: extractNames(m.country || m.countries),
      actors: extractNames(m.actors),
      directors: extractNames(m.directors),
      trailerUrl: typeof m.trailer_url === "string" ? m.trailer_url.trim() : undefined,
      episodes,
      provider: "nguonc",
    };
  }

  private async fetchOPhimDetail(slug: string): Promise<CrawlMovieResult> {
    const mirrors = ["https://ophim1.com", "https://ophim.live", "https://ophim17.cc"];
    let lastErr = "";

    for (const mirror of mirrors) {
      try {
        const url = `${mirror}/phim/${encodeURIComponent(slug)}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8_000),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as Record<string, unknown>;
        if (!data.status || !data.movie || typeof data.movie !== "object") continue;

        const m = data.movie as Record<string, unknown>;
        const episodes: CrawlEpisodeItem[] = [];

        if (Array.isArray(data.episodes)) {
          for (const server of data.episodes) {
            if (typeof server !== "object" || server === null) continue;
            const s = server as Record<string, unknown>;
            const sName = String(s.server_name || "OPhim VIP").trim();
            if (Array.isArray(s.server_data)) {
              for (const item of s.server_data) {
                if (typeof item !== "object" || item === null) continue;
                const it = item as Record<string, unknown>;
                const streamUrl = String(it.link_m3u8 || it.link_embed || "").trim();
                if (!streamUrl) continue;
                episodes.push({
                  name: String(it.name || "Full").trim(),
                  slug: String(it.slug || `tap-${String(it.name || 1)}`).trim(),
                  serverName: sName,
                  streamUrl,
                  embedUrl: it.link_embed ? String(it.link_embed).trim() : undefined,
                });
              }
            }
          }
        }

        const rawYear = Number(m.year);
        const parsedTotal = parseInt(String(m.episode_total || "").replace(/\D/g, ""), 10);

        return {
          slug: String(m.slug || slug).trim(),
          title: String(m.name || slug).trim(),
          originName: m.origin_name ? String(m.origin_name).trim() : undefined,
          year: Number.isFinite(rawYear) && rawYear > 0 ? Math.trunc(rawYear) : undefined,
          type: String(m.type || "single").trim(),
          status: String(m.status || "completed").trim(),
          totalEpisodes: Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : undefined,
          quality: m.quality ? String(m.quality).trim() : "HD",
          language: m.lang ? String(m.lang).trim() : "Vietsub",
          posterUrl: this.normalizeImageUrl(typeof m.poster_url === "string" ? m.poster_url : undefined, "ophim"),
          thumbUrl: this.normalizeImageUrl(typeof m.thumb_url === "string" ? m.thumb_url : undefined, "ophim"),
          description: this.cleanDescription(typeof m.content === "string" ? m.content : undefined),
          genres: extractNames(m.category),
          countries: extractNames(m.country),
          actors: extractNames(m.actor),
          directors: extractNames(m.director),
          trailerUrl: typeof m.trailer_url === "string" ? m.trailer_url.trim() : undefined,
          episodes,
          provider: "ophim",
        };
      } catch (err: unknown) {
        lastErr = err instanceof Error ? err.message : String(err);
      }
    }
    throw new Error(`Không thể cào OPhim (các mirror đều bận hoặc chặn IP): ${lastErr}`);
  }

  /**
   * Persists crawled movie detail and all episodes into PostgreSQL
   */
  public async ingestMovie(result: CrawlMovieResult): Promise<{ created: boolean; episodeCount: number }> {
    const existing = await this.prisma.movie.findUnique({
      where: { id: result.slug },
      select: { id: true, sources: true },
    });

    const isCreated = !existing;
    const currentSources = new Set(existing?.sources || []);
    currentSources.add(result.provider);

    await this.prisma.movie.upsert({
      where: { id: result.slug },
      create: {
        id: result.slug,
        title: result.title,
        originName: result.originName,
        posterUrl: result.posterUrl,
        thumbUrl: result.thumbUrl,
        year: result.year,
        type: result.type,
        status: result.status,
        totalEpisodes: result.totalEpisodes,
        description: result.description,
        quality: result.quality,
        language: result.language,
        trailerUrl: result.trailerUrl,
        genres: result.genres,
        countries: result.countries,
        actors: result.actors,
        directors: result.directors,
        sources: Array.from(currentSources),
      },
      update: {
        title: result.title,
        originName: result.originName || undefined,
        posterUrl: result.posterUrl || undefined,
        thumbUrl: result.thumbUrl || undefined,
        year: result.year || undefined,
        type: result.type,
        status: result.status || undefined,
        totalEpisodes: result.totalEpisodes || undefined,
        description: result.description || undefined,
        quality: result.quality || undefined,
        language: result.language || undefined,
        trailerUrl: result.trailerUrl || undefined,
        genres: result.genres.length > 0 ? result.genres : undefined,
        countries: result.countries.length > 0 ? result.countries : undefined,
        actors: result.actors.length > 0 ? result.actors : undefined,
        directors: result.directors.length > 0 ? result.directors : undefined,
        sources: Array.from(currentSources),
      },
    });

    let episodeCount = 0;
    for (const ep of result.episodes) {
      await this.prisma.moviePlaybackSource.upsert({
        where: {
          movieId_provider_providerSlug_episodeKey_serverName: {
            movieId: result.slug,
            provider: result.provider,
            providerSlug: result.slug,
            episodeKey: ep.slug,
            serverName: ep.serverName,
          },
        },
        create: {
          movieId: result.slug,
          provider: result.provider,
          providerSlug: result.slug,
          episodeKey: ep.slug,
          episodeName: ep.name.startsWith("Tập") ? ep.name : `Tập ${ep.name}`,
          serverName: ep.serverName,
          streamUrl: ep.streamUrl,
          healthStatus: "healthy",
          adCuePoints: [],
          priority: 0,
        },
        update: {
          episodeName: ep.name.startsWith("Tập") ? ep.name : `Tập ${ep.name}`,
          streamUrl: ep.streamUrl,
          healthStatus: "healthy",
        },
      });
      episodeCount++;
    }

    if (result.episodes.length > 0) {
      await this.prisma.moviePlaybackSource.deleteMany({
        where: {
          movieId: result.slug,
          episodeKey: "catalog",
        },
      });
    }

    return { created: isCreated, episodeCount };
  }

  /**
   * Crawl a single movie on-demand by slug or URL
   */
  public async crawlSingle(slugOrUrl: string, providerOverride?: string) {
    const { slug, provider } = this.parseInput(slugOrUrl, providerOverride);
    const detail = await this.fetchDetail(provider, slug);
    const result = await this.ingestMovie(detail);
    return {
      success: true,
      provider,
      slug,
      title: detail.title,
      created: result.created,
      episodeCount: result.episodeCount,
      servers: Array.from(new Set(detail.episodes.map((e) => e.serverName))),
      movie: {
        id: detail.slug,
        title: detail.title,
        originName: detail.originName,
        year: detail.year,
        posterUrl: detail.posterUrl,
        genres: detail.genres,
        quality: detail.quality,
      },
    };
  }

  /**
   * Launch a batch crawl job across a range of pages and categories
   */
  public startBatchJob(options: {
    provider: string;
    category?: string;
    startPage?: number;
    endPage?: number;
    deep?: boolean;
    delayMs?: number;
  }): CrawlerJob {
    const jobId = `crawl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const category = options.category || "phim-moi-cap-nhat";
    const startPage = Math.max(1, Number(options.startPage) || 1);
    const endPage = Math.max(startPage, Number(options.endPage) || startPage);
    const deep = options.deep !== false;

    const job: CrawlerJob = {
      id: jobId,
      provider: options.provider || "kkphim",
      category,
      startPage,
      endPage,
      currentPage: startPage,
      status: "running",
      deep,
      totalMoviesFound: 0,
      moviesProcessed: 0,
      moviesCreated: 0,
      moviesUpdated: 0,
      episodesImported: 0,
      errors: [],
      logs: [`[${new Date().toLocaleTimeString("vi-VN")}] Bắt đầu tiến trình cào ${options.provider} (${category}) từ trang ${startPage} đến ${endPage}...`],
      startedAt: new Date(),
      cancelled: false,
    };

    this.jobs.set(jobId, job);

    if (this.jobs.size > 25) {
      const oldestKey = this.jobs.keys().next().value;
      if (oldestKey) this.jobs.delete(oldestKey);
    }

    void this.executeBatchJob(job, options.delayMs || 350);

    return job;
  }

  private async executeBatchJob(job: CrawlerJob, delayMs: number) {
    try {
      for (let page = job.startPage; page <= job.endPage; page++) {
        if (job.cancelled) {
          job.status = "cancelled";
          job.logs.push(`[${new Date().toLocaleTimeString("vi-VN")}] Tiến trình đã bị hủy bởi quản trị viên.`);
          break;
        }

        job.currentPage = page;
        job.logs.push(`[${new Date().toLocaleTimeString("vi-VN")}] Đang quét trang ${page}/${job.endPage}...`);

        let items: Array<{ slug: string; name: string }> = [];

        try {
          if (job.provider === "kkphim") {
            const path = job.category === "phim-moi-cap-nhat"
              ? `https://phimapi.com/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}`
              : `https://phimapi.com/v1/api/danh-sach/${job.category}?page=${page}`;
            const res = await fetch(path, { signal: AbortSignal.timeout(15_000) });
            if (res.ok) {
              const data = (await res.json()) as { data?: { items?: unknown[] }; items?: unknown[] };
              const rawItems = (data.data?.items || data.items || []) as Array<Record<string, unknown>>;
              items = rawItems.map((i) => ({
                slug: String(i.slug || i._id).trim(),
                name: String(i.name || i.title || i.slug).trim(),
              }));
            }
          } else if (job.provider === "nguonc") {
            const path = job.category === "phim-moi-cap-nhat"
              ? `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${page}`
              : `https://phim.nguonc.com/api/films/danh-sach/${job.category}?page=${page}`;
            const res = await fetch(path, { signal: AbortSignal.timeout(15_000) });
            if (res.ok) {
              const data = (await res.json()) as { items?: unknown[] };
              const rawItems = (data.items || []) as Array<Record<string, unknown>>;
              items = rawItems.map((i) => ({
                slug: String(i.slug).trim(),
                name: String(i.name || i.slug).trim(),
              }));
            }
          }
        } catch (fetchErr: unknown) {
          const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          job.errors.push(`Trang ${page}: ${msg}`);
          job.logs.push(`[${new Date().toLocaleTimeString("vi-VN")}] ⚠️ Lỗi tải trang ${page}: ${msg}`);
          continue;
        }

        job.totalMoviesFound += items.length;
        job.logs.push(`[${new Date().toLocaleTimeString("vi-VN")}] Tìm thấy ${items.length} phim tại trang ${page}.`);

        for (const item of items) {
          if (job.cancelled) break;

          try {
            if (job.deep) {
              const detail = await this.fetchDetail(job.provider, item.slug);
              const ingest = await this.ingestMovie(detail);
              job.moviesProcessed++;
              if (ingest.created) job.moviesCreated++;
              else job.moviesUpdated++;
              job.episodesImported += ingest.episodeCount;
              job.logs.push(`[${new Date().toLocaleTimeString("vi-VN")}] ✓ ${detail.title} (${ingest.episodeCount} tập)`);
            } else {
              await this.prisma.movie.upsert({
                where: { id: item.slug },
                create: { id: item.slug, title: item.name, type: "single", sources: [job.provider] },
                update: { title: item.name, sources: { push: job.provider } },
              });
              job.moviesProcessed++;
              job.moviesCreated++;
            }
          } catch (itemErr: unknown) {
            const msg = itemErr instanceof Error ? itemErr.message : String(itemErr);
            job.errors.push(`${item.slug}: ${msg}`);
          }

          if (delayMs > 0) {
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }
      }

      if (!job.cancelled) {
        job.status = "completed";
        job.logs.push(`[${new Date().toLocaleTimeString("vi-VN")}] Hoàn thành job: ${job.moviesProcessed} phim, ${job.episodesImported} tập phim đã lưu trữ.`);
      }
    } catch (err: unknown) {
      job.status = "failed";
      const msg = err instanceof Error ? err.message : String(err);
      job.errors.push(`Lỗi nghiêm trọng: ${msg}`);
      job.logs.push(`[${new Date().toLocaleTimeString("vi-VN")}] Lỗi nghiêm trọng: ${msg}`);
    } finally {
      job.finishedAt = new Date();
    }
  }

  public getJobs(): CrawlerJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );
  }

  public getJob(id: string): CrawlerJob | undefined {
    return this.jobs.get(id);
  }

  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    job.cancelled = true;
    job.status = "cancelled";
    job.finishedAt = new Date();
    return true;
  }
}
