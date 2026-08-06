import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisCacheService } from "../redis/redis.service";
import axios, { AxiosInstance } from "axios";

@Injectable()
export class VidsrcService {
  private readonly logger = new Logger(VidsrcService.name);
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: RedisCacheService,
  ) {
    this.baseUrl = config.get("VIDSRC_BASE_URL") || "https://vidsrc.to/api";
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: { Accept: "application/json" },
    });
  }

  private async cachedGet<T>(key: string, url: string, ttlSeconds = 300): Promise<T> {
    const cached = await this.cache.getJson<T>(`movies:vidsrc:${key}`);
    if (cached !== null) return cached;

    try {
      const { data } = await this.http.get<T>(url);
      await this.cache.setJson(`movies:vidsrc:${key}`, data, ttlSeconds);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`VidSrc API error for ${url}: ${msg}`);
      throw err;
    }
  }

  async getMovie(slug: string) {
    return this.cachedGet(`detail:${slug}`, `/movie/${slug}`, 600);
  }

  async search(keyword: string, page = 1) {
    return this.cachedGet(`search:${keyword}:${page}`, `/search?keyword=${encodeURIComponent(keyword)}&page=${page}`, 60);
  }
}
