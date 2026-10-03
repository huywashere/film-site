import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { createHash } from "crypto";
import { RedisCacheService } from "../redis/redis.service";

@Injectable()
export class TranslateService {
  private readonly logger = new Logger(TranslateService.name);
  private readonly CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

  constructor(private readonly redis: RedisCacheService) {}

  private hashKey(text: string, from: string, to: string): string {
    const hash = createHash("md5").update(`${from}:${to}:${text}`).digest("hex");
    return `translate:${from}:${to}:${hash}`;
  }

  /**
   * Translate a single piece of text with Redis caching
   */
  async translateText(text: string, from = "auto", to = "vi"): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return "";

    const cacheKey = this.hashKey(trimmed, from, to);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return cached;
    } catch {
      // Redis failover fallback
    }

    try {
      const response = await axios.get("https://translate.googleapis.com/translate_a/single", {
        params: {
          client: "gtx",
          sl: from,
          tl: to,
          dt: "t",
          q: trimmed,
        },
        timeout: 8000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });

      if (Array.isArray(response.data) && Array.isArray(response.data[0])) {
        const translated = response.data[0]
          .map((chunk: unknown) =>
            Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : "",
          )
          .join("");

        if (translated) {
          try {
            await this.redis.set(cacheKey, translated, this.CACHE_TTL_SECONDS);
          } catch {
            // Ignore Redis write error
          }
          return translated;
        }
      }

      return trimmed;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Translation failed for text [${trimmed.slice(0, 30)}...]: ${msg}`);
      return trimmed;
    }
  }

  /**
   * Translate an array of strings in batches
   */
  async translateBatch(texts: string[], from = "auto", to = "vi"): Promise<string[]> {
    const results: string[] = [];
    const batchSize = 10;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map((item) => this.translateText(item, from, to));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Translate WebVTT or SRT subtitles line-by-line while preserving cue time stamps
   */
  async translateSubtitle(content: string, from = "auto", to = "vi"): Promise<string> {
    const lines = content.split(/\r?\n/);
    const timestampRegex =
      /(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3})/;

    const textToTranslate: { lineIndex: number; text: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip empty lines, numeric cue indexes, WEBVTT headers, NOTE comments, and timestamp lines
      if (!line) continue;
      if (/^\d+$/.test(line)) continue;
      if (line.startsWith("WEBVTT") || line.startsWith("NOTE") || line.startsWith("STYLE")) continue;
      if (timestampRegex.test(line)) continue;

      textToTranslate.push({ lineIndex: i, text: line });
    }

    if (textToTranslate.length === 0) return content;

    // Translate all collected lines in batches
    const rawTexts = textToTranslate.map((item) => item.text);
    const translatedTexts = await this.translateBatch(rawTexts, from, to);

    const outputLines = [...lines];
    for (let i = 0; i < textToTranslate.length; i++) {
      const lineIdx = textToTranslate[i].lineIndex;
      outputLines[lineIdx] = translatedTexts[i] || lines[lineIdx];
    }

    return outputLines.join("\n");
  }
}
