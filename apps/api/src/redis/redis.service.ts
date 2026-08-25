import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private isDisabled = false;
  private readonly stats = { hits: 0, misses: 0, sets: 0, errors: 0 };

  /** In-memory fallback when Redis is offline */
  private readonly mem = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  /** Coalesces concurrent cache misses inside this API process. */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>(
      "REDIS_URL",
      "redis://localhost:6379",
    );
    this.connect(redisUrl);
  }

  private connect(redisUrl: string) {
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 500,
        lazyConnect: false,
      });

      this.client.on("connect", () => {
        this.logger.log("✅ Redis connected – caching active");
        this.isDisabled = false;
      });

      this.client.on("error", () => {
        if (!this.isDisabled) {
          this.logger.warn("⚡ Cache status: In-Memory active (Redis offline)");
          this.isDisabled = true;
          this.client?.disconnect();
          this.client = null;
        }
      });
    } catch {
      this.logger.warn("⚡ Cache status: In-Memory active (Redis offline)");
      this.isDisabled = true;
      this.client = null;
    }
  }

  private get isReady(): boolean {
    return (
      !this.isDisabled && this.client !== null && this.client.status === "ready"
    );
  }

  /** Get a cached value. Returns null on miss or Redis offline. */
  async get(key: string): Promise<string | null> {
    if (this.isReady) {
      try {
        const value = await this.client!.get(key);
        if (value !== null) {
          this.stats.hits += 1;
          return value;
        }
      } catch {
        this.stats.errors += 1;
        // fall through to memory
      }
    }

    // In-memory fallback
    const rec = this.mem.get(key);
    if (rec && rec.expiresAt > Date.now()) {
      this.stats.hits += 1;
      return rec.value;
    }
    if (rec) this.mem.delete(key);
    this.stats.misses += 1;
    return null;
  }

  /** Set a value with TTL in seconds. */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.stats.sets += 1;
    if (this.isReady) {
      try {
        await this.client!.set(key, value, "EX", ttlSeconds);
        return;
      } catch {
        this.stats.errors += 1;
        // fall through to memory
      }
    }

    // In-memory fallback
    this.mem.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });

    // Evict old entries periodically (keep mem under 500 keys)
    if (this.mem.size > 500) {
      const now = Date.now();
      for (const [k, v] of this.mem) {
        if (v.expiresAt <= now) this.mem.delete(k);
        if (this.mem.size <= 400) break;
      }
      while (this.mem.size > 500) {
        const oldest = this.mem.keys().next().value;
        if (!oldest) break;
        this.mem.delete(oldest);
      }
    }
  }

  /** Delete a key from cache. */
  async del(key: string): Promise<void> {
    this.mem.delete(key);
    if (this.isReady) {
      try {
        await this.client!.del(key);
      } catch {
        // ignore
      }
    }
  }

  /** Helper: get parsed JSON from cache */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** Helper: set serialized JSON in cache */
  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /** Get or compute cached value with SWR dual-tier fallback */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300,
  ): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) return cached;

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    if (this.inFlight.size >= 500) {
      return factory();
    }

    const pending = (async () => {
      const fresh = await factory();
      if (fresh !== null && fresh !== undefined) {
        await this.setJson(key, fresh, ttlSeconds);
      }
      return fresh;
    })().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, pending);
    return pending;
  }

  getStats() {
    const lookups = this.stats.hits + this.stats.misses;
    return {
      backend: this.isReady ? "redis" : "memory",
      ...this.stats,
      hitRate: lookups > 0 ? this.stats.hits / lookups : 0,
      memoryEntries: this.mem.size,
    };
  }

  async inspectNamespaces(limit = 5000) {
    const counts = new Map<string, number>();
    let scanned = 0;
    if (this.isReady) {
      let cursor = "0";
      do {
        const [next, keys] = await this.client!.scan(cursor, "COUNT", 250);
        cursor = next;
        for (const key of keys) {
          const namespace = key.includes(":") ? key.split(":", 1)[0] : "other";
          counts.set(namespace, (counts.get(namespace) || 0) + 1);
        }
        scanned += keys.length;
      } while (cursor !== "0" && scanned < limit);
    } else {
      for (const key of this.mem.keys()) {
        const namespace = key.includes(":") ? key.split(":", 1)[0] : "other";
        counts.set(namespace, (counts.get(namespace) || 0) + 1);
      }
      scanned = this.mem.size;
    }
    return {
      ...this.getStats(),
      scanned,
      namespaces: [...counts.entries()]
        .map(([name, keys]) => ({ name, keys }))
        .sort((a, b) => b.keys - a.keys),
    };
  }

  async purgeNamespace(namespace: string) {
    if (!/^[a-zA-Z0-9._-]{1,64}$/.test(namespace)) {
      throw new Error("Cache namespace không hợp lệ");
    }
    let deleted = 0;
    for (const key of [...this.mem.keys()]) {
      if (key === namespace || key.startsWith(`${namespace}:`)) {
        this.mem.delete(key);
        deleted += 1;
      }
    }
    if (this.isReady) {
      let cursor = "0";
      do {
        const [next, keys] = await this.client!.scan(cursor, "MATCH", `${namespace}:*`, "COUNT", 250);
        cursor = next;
        if (keys.length) deleted += await this.client!.del(...keys);
      } while (cursor !== "0");
      if (await this.client!.exists(namespace)) deleted += await this.client!.del(namespace);
    }
    return { namespace, deleted };
  }

  // ── RediSearch Full-Text Search Methods ────────────────────────────────────

  /** Kiểm tra Redis Stack có hỗ trợ RediSearch module không */
  private redisearchAvailable: boolean | null = null;

  private async checkRediSearch(): Promise<boolean> {
    if (this.redisearchAvailable !== null) return this.redisearchAvailable;
    if (!this.isReady) {
      this.redisearchAvailable = false;
      return false;
    }
    try {
      // FT.INFO sẽ throw nếu module không tồn tại
      await this.client!.call("FT._LIST");
      this.redisearchAvailable = true;
      this.logger.log("✅ RediSearch module available — full-text search enabled");
    } catch {
      this.redisearchAvailable = false;
      this.logger.warn("⚠️ RediSearch module không có — dùng key-value cache bình thường");
    }
    return this.redisearchAvailable;
  }

  /**
   * Tạo RediSearch index cho phim (chạy 1 lần khi startup).
   * Schema hỗ trợ:
   * - name, origin_name: TEXT có weight cao (tìm theo tên)
   * - slug: TAG (exact match)
   * - year: NUMERIC sortable
   * - type: TAG (lọc theo loại phim)
   * - norm_name: TEXT (tên đã bỏ dấu — tăng khả năng tìm kiếm không dấu)
   */
  async ftCreateIndex(indexName = "phim_idx"): Promise<void> {
    if (!(await this.checkRediSearch())) return;
    try {
      // Drop nếu đã tồn tại (idempotent)
      await this.client!.call("FT.DROPINDEX", indexName).catch(() => null);
      await this.client!.call(
        "FT.CREATE", indexName,
        "ON", "HASH",
        "PREFIX", "1", `${indexName}:`,
        "LANGUAGE", "english",        // Default language (RediSearch không có built-in VN stemmer)
        "LANGUAGE_FIELD", "__lang",    // Mỗi doc có thể override language
        "SCHEMA",
        "name",        "TEXT", "WEIGHT", "5.0", "NOSTEM",  // NOSTEM vì VN không cần English stemmer
        "origin_name", "TEXT", "WEIGHT", "4.0", "NOSTEM",
        "norm_name",   "TEXT", "WEIGHT", "3.0", "NOSTEM",  // Tên đã bỏ dấu
        "norm_origin", "TEXT", "WEIGHT", "2.0", "NOSTEM",  // Tên gốc đã bỏ dấu
        "slug",        "TAG",
        "year",        "NUMERIC", "SORTABLE",
        "type",        "TAG",
      );
      this.logger.log(`✅ RediSearch index "${indexName}" created`);
    } catch (err) {
      this.logger.warn(`RediSearch createIndex error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Index 1 phim vào RediSearch.
   * normName/normOrigin là tên đã bỏ dấu tiếng Việt để tăng recall khi search không dấu.
   */
  async ftIndexDoc(
    indexName = "phim_idx",
    slug: string,
    doc: {
      name: string;
      origin_name?: string;
      norm_name: string;
      norm_origin?: string;
      year?: number;
      type?: string;
    },
  ): Promise<void> {
    if (!(await this.checkRediSearch())) return;
    try {
      const key = `${indexName}:${slug}`;
      const fields: string[] = [
        "name", doc.name || "",
        "norm_name", doc.norm_name || "",
        "__lang", "english",
      ];
      if (doc.origin_name) fields.push("origin_name", doc.origin_name);
      if (doc.norm_origin) fields.push("norm_origin", doc.norm_origin);
      if (doc.year) fields.push("year", String(doc.year));
      if (doc.type) fields.push("type", doc.type);
      fields.push("slug", slug);

      await this.client!.call("HSET", key, ...fields);
    } catch {
      // Ignore index errors — không ảnh hưởng main flow
    }
  }

  /**
   * Full-text search qua RediSearch.
   * Hỗ trợ:
   * - Tìm không dấu (norm_name): "avengers" → "avengers"
   * - Fuzzy match (typo): "avengrs" → "avengers" (1 lỗi)
   * - Multi-field: search cả name + origin_name + norm_name
   *
   * Returns danh sách slug matches, caller tự fetch detail từ KKPhim.
   */
  async ftSearch(
    indexName = "phim_idx",
    keyword: string,
    limit = 24,
  ): Promise<Array<{ slug: string; name: string; score: number }>> {
    if (!(await this.checkRediSearch())) return [];
    if (!keyword.trim()) return [];

    try {
      // Escape special characters cho RediSearch query syntax
      const escaped = keyword.trim().replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s]/g, " ").trim();
      if (!escaped) return [];

      // Query: tìm exact + fuzzy (% = 1 edit distance)
      // Ưu tiên: exact match > prefix > fuzzy
      const query = `(@norm_name:${escaped}* | @norm_origin:${escaped}* | @name:${escaped}* | %${escaped}%)`;

      const raw = await this.client!.call(
        "FT.SEARCH", indexName, query,
        "LIMIT", "0", String(limit),
        "RETURN", "3", "slug", "name", "__score",
        "SORTBY", "__score", "DESC",
      ) as any[];

      if (!Array.isArray(raw) || raw.length < 1) return [];

      const results: Array<{ slug: string; name: string; score: number }> = [];
      // raw[0] = total count, raw[1..] = [key, [field, val, ...], key, ...]
      for (let i = 1; i < raw.length; i += 2) {
        const fields = raw[i + 1] as string[];
        if (!Array.isArray(fields)) continue;
        const fieldMap: Record<string, string> = {};
        for (let j = 0; j < fields.length; j += 2) {
          fieldMap[fields[j]] = fields[j + 1];
        }
        if (fieldMap["slug"]) {
          results.push({
            slug: fieldMap["slug"],
            name: fieldMap["name"] || "",
            score: parseFloat(fieldMap["__score"] || "0"),
          });
        }
      }
      return results;
    } catch (err) {
      this.logger.warn(`RediSearch ftSearch error: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => this.client?.disconnect());
    }
  }
}
