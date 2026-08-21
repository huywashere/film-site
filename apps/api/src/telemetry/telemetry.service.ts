import { Injectable, Logger } from "@nestjs/common";
import * as Sentry from "@sentry/node";
import { ClientTelemetryDto } from "./dto/client-telemetry.dto";
import { RedisCacheService } from "../redis/redis.service";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

type TelemetrySample = {
  name: string;
  route: string;
  timestamp: number;
  value?: number;
  durationMs?: number;
  status?: number;
  cache?: string;
};

function percentile(values: number[], ratio: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly samples: TelemetrySample[] = [];

  constructor(
    private readonly cache: RedisCacheService,
    private readonly prisma: PrismaService,
  ) {}

  captureMany(events: ClientTelemetryDto[]) {
    for (const event of events) this.capture(event);
  }

  capture(event: ClientTelemetryDto) {
    const level = event.level || "info";
    const tags = {
      client_event: event.name,
      route: event.route || "unknown",
    };

    const properties = event.properties || {};
    const numeric = (key: string) => {
      const value = properties[key];
      return typeof value === "number" && Number.isFinite(value)
        ? value
        : undefined;
    };
    this.samples.push({
      name: event.name,
      route: event.route || "unknown",
      timestamp: Date.parse(event.timestamp || "") || Date.now(),
      value: numeric("value"),
      durationMs: numeric("duration_ms"),
      status: numeric("status"),
      cache:
        typeof properties.cache === "string" ? properties.cache : undefined,
    });
    if (this.samples.length > 2_000) {
      this.samples.splice(0, this.samples.length - 2_000);
    }

    if (
      event.name.startsWith("player.") ||
      event.name.startsWith("watch_now.")
    ) {
      void this.persistPlaybackEvent(event).catch((error) => {
        this.logger.debug(
          `Không thể lưu playback event: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
    if (event.name === "search.completed") {
      void this.persistSearchEvent(event).catch((error) => {
        this.logger.debug(`Không thể lưu search event: ${error instanceof Error ? error.message : String(error)}`);
      });
    }

    this.logger.debug({ ...tags, properties: event.properties });
    // Routine Web Vitals and timings stay in the rolling dashboard buffer.
    // Sending all of them to Sentry adds ingestion and request overhead, so
    // only actionable warnings/errors leave the API process.
    if (level !== "info") {
      Sentry.withScope((scope) => {
        scope.setTags(tags);
        scope.setContext("client_event", {
          ...event.properties,
          timestamp: event.timestamp,
        });
        Sentry.captureMessage(`Client telemetry: ${event.name}`, level);
      });
    }
  }

  private async persistSearchEvent(event: ClientTelemetryDto) {
    const properties = event.properties || {};
    const query = typeof properties.query === "string" ? properties.query.trim().slice(0, 180) : "";
    if (!query) return;
    const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
    await this.prisma.searchEvent.create({
      data: {
        query,
        normalized,
        resultCount: typeof properties.result_count === "number" ? Math.max(0, Math.round(properties.result_count)) : 0,
        route: event.route,
        sessionId: typeof properties.session_id === "string" ? properties.session_id.slice(0, 180) : undefined,
        deviceType: typeof properties.device_type === "string" ? properties.device_type.slice(0, 80) : undefined,
        occurredAt: event.timestamp ? new Date(event.timestamp) : new Date(),
      },
    });
  }

  private async persistPlaybackEvent(event: ClientTelemetryDto) {
    const properties = event.properties || {};
    const text = (key: string, max = 180) =>
      typeof properties[key] === "string"
        ? String(properties[key]).slice(0, max)
        : undefined;
    const number = (key: string) =>
      typeof properties[key] === "number" && Number.isFinite(properties[key])
        ? Math.max(0, Math.round(properties[key] as number))
        : undefined;
    const route = event.route || "";
    const routeSlug = route.match(/\/watch\/([^/?#]+)/)?.[1];
    const movieId = routeSlug
      ? (
          await this.prisma.movie.findUnique({
            where: { id: decodeURIComponent(routeSlug) },
            select: { id: true },
          })
        )?.id
      : undefined;
    await this.prisma.playbackEvent.create({
      data: {
        eventType: event.name,
        movieId,
        route: route.slice(0, 500) || undefined,
        sessionId: text("session_id"),
        userId: text("user_id"),
        provider: text("source") || text("provider"),
        serverName: text("server"),
        episode: text("episode"),
        quality: text("quality"),
        deviceType: text("device_type"),
        country: text("country", 10),
        errorCode: text("error_kind") || text("error_code"),
        bufferMs: number("buffer_ms"),
        durationMs: number("start_time_ms") || number("duration_ms"),
        fromSource: text("from_source"),
        toSource: text("to_source"),
        metadata: properties as Prisma.InputJsonValue,
        occurredAt: event.timestamp ? new Date(event.timestamp) : new Date(),
      },
    });
    if (movieId && (text("source") || text("provider"))) {
      const failed = ["player.source_failed", "player.error"].includes(
        event.name,
      );
      const succeeded = ["watch_now.success", "player.iframe_loaded"].includes(
        event.name,
      );
      if (failed || succeeded) {
        await this.prisma.moviePlaybackSource.updateMany({
          where: {
            movieId,
            provider: text("source") || text("provider"),
            ...(text("server") ? { serverName: text("server") } : {}),
          },
          data: {
            healthStatus: failed ? "down" : "operational",
            lastCheckedAt: new Date(),
            lastError: failed
              ? text("error_kind", 500) || "playback_error"
              : null,
          },
        });
      }
    }
  }

  snapshot(windowMinutes = 60) {
    const cutoff = Date.now() - windowMinutes * 60_000;
    const recent = this.samples.filter((sample) => sample.timestamp >= cutoff);
    const metricCeilings: Record<string, number> = {
      "web_vital.lcp": 120_000,
      "web_vital.inp": 60_000,
      "web_vital.cls": 10,
    };
    const valuesFor = (name: string) => {
      const ceiling = metricCeilings[name] ?? Number.POSITIVE_INFINITY;
      return recent
        .filter(
          (sample) =>
            sample.name === name &&
            sample.value !== undefined &&
            sample.value >= 0 &&
            sample.value <= ceiling,
        )
        .map((sample) => sample.value as number);
    };
    const summarize = (values: number[]) => ({
      count: values.length,
      p50: percentile(values, 0.5),
      p95: percentile(values, 0.95),
    });
    const apiSamples = recent.filter(
      (sample) =>
        (sample.name === "api.response" ||
          sample.name === "movie_api.response") &&
        sample.durationMs !== undefined,
    );
    const apiErrors = recent.filter(
      (sample) =>
        sample.name === "api.error" || sample.name === "movie_api.error",
    ).length;
    const cacheHits = apiSamples.filter((sample) =>
      /hit/i.test(sample.cache || ""),
    ).length;
    const playbackSuccess = recent.filter((sample) =>
      ["watch_now.success", "player.iframe_loaded"].includes(sample.name),
    ).length;
    const playbackFallbacks = recent.filter(
      (sample) => sample.name === "player.fallback",
    ).length;
    const memory = process.memoryUsage();

    return {
      generatedAt: new Date().toISOString(),
      windowMinutes,
      webVitals: {
        lcp: summarize(valuesFor("web_vital.lcp")),
        inp: summarize(valuesFor("web_vital.inp")),
        cls: summarize(valuesFor("web_vital.cls")),
      },
      api: {
        requests: apiSamples.length,
        errors: apiErrors,
        errorRate:
          apiSamples.length + apiErrors > 0
            ? apiErrors / (apiSamples.length + apiErrors)
            : 0,
        latency: summarize(
          apiSamples.map((sample) => sample.durationMs as number),
        ),
        reportedCacheHitRate:
          apiSamples.length > 0 ? cacheHits / apiSamples.length : 0,
      },
      playback: {
        successes: playbackSuccess,
        fallbacks: playbackFallbacks,
        fallbackRate:
          playbackSuccess + playbackFallbacks > 0
            ? playbackFallbacks / (playbackSuccess + playbackFallbacks)
            : 0,
      },
      cache: this.cache.getStats(),
      process: {
        uptimeSeconds: Math.round(process.uptime()),
        heapUsedBytes: memory.heapUsed,
        rssBytes: memory.rss,
      },
      samples: recent.length,
    };
  }
}
