import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisCacheService } from "../redis/redis.service";
import axios from "axios";

/**
 * SearchIndexerService — Background RediSearch Warm Indexer
 *
 * Khi API khởi động, fetch các trang phim từ KKPhim và index vào RediSearch.
 * Điều này giúp query đầu tiên của user trả về ngay từ RediSearch (sub-1ms)
 * thay vì chờ upstream KKPhim (~300-500ms).
 *
 * Flow:
 *   1. Tạo RediSearch index schema
 *   2. Sau 5s (không block startup), fetch 5 trang phim mới nhất
 *   3. Index từng phim với tên bỏ dấu vào Redis Hash
 *   4. Mỗi khi có phim mới được tìm kiếm (từ movies.service.ts),
 *      gọi indexFilm() để cập nhật index realtime
 */
@Injectable()
export class SearchIndexerService implements OnModuleInit {
  private readonly logger = new Logger(SearchIndexerService.name);
  private readonly baseUrl: string;
  private readonly INDEX_NAME = "phim_idx";

  constructor(
    private readonly cache: RedisCacheService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = config.get("KKPHIM_BASE_URL") || "https://phimapi.com";
  }

  async onModuleInit() {
    // Tạo RediSearch index schema ngay khi module init
    await this.cache.ftCreateIndex(this.INDEX_NAME);

    // Warm index sau 5s — không block startup
    setTimeout(() => this.warmIndex(), 5000);
  }

  /**
   * Bỏ dấu tiếng Việt — phiên bản server-side (Node.js, không có browser APIs vấn đề)
   * Dùng NFD normalize vì server-side không có perf constraint như browser.
   */
  private removeAccents(str: string): string {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Index một phim vào RediSearch.
   * Gọi từ SearchIndexerService (warm) hoặc MoviesService (realtime).
   */
  async indexFilm(film: {
    slug: string;
    name?: string;
    origin_name?: string;
    year?: number;
    type?: string;
  }): Promise<void> {
    if (!film.slug) return;
    await this.cache.ftIndexDoc(this.INDEX_NAME, film.slug, {
      name: film.name || "",
      origin_name: film.origin_name,
      norm_name: this.removeAccents(film.name || ""),
      norm_origin: film.origin_name
        ? this.removeAccents(film.origin_name)
        : undefined,
      year: film.year,
      type: film.type,
    });
  }

  /**
   * Warm RediSearch index bằng cách fetch các trang phim phổ biến từ KKPhim.
   * Chạy background sau startup — không ảnh hưởng latency.
   */
  private async warmIndex(): Promise<void> {
    this.logger.log("🔥 Warming RediSearch index from KKPhim...");
    let totalIndexed = 0;

    try {
      // Fetch 5 trang đầu (5 × 24 = 120 phim) để seed index ban đầu
      const pages = [1, 2, 3, 4, 5];
      for (const page of pages) {
        try {
          const { data } = await axios.get(
            `${this.baseUrl}/danh-sach/phim-moi-cap-nhat?page=${page}`,
            { timeout: 8000 },
          );

          const items: any[] = data?.items || data?.data?.items || [];
          for (const film of items) {
            if (film?.slug) {
              await this.indexFilm({
                slug: film.slug,
                name: film.name,
                origin_name: film.origin_name,
                year: film.year,
                type: film.type,
              });
              totalIndexed++;
            }
          }

          // Delay nhỏ giữa các page để không spam upstream
          await new Promise((r) => setTimeout(r, 200));
        } catch (err) {
          this.logger.warn(
            `Warm index page ${page} error: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      this.logger.log(
        `✅ RediSearch warm complete — ${totalIndexed} phim indexed`,
      );
    } catch (err) {
      this.logger.warn(
        `Warm index failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
