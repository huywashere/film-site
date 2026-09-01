export const NETPHIM_TOPIC_EXCHANGE = 'netphim.events';

export const RABBITMQ_QUEUES = {
  MOVIE_CRAWL: 'netphim.crawl.queue',
  CACHE_INVALIDATION: 'netphim.cache.invalidation.queue',
  TELEMETRY: 'netphim.telemetry.queue',
  MEDIA_PROCESSING: 'netphim.media.processing.queue',
} as const;

export const RABBITMQ_ROUTING_KEYS = {
  MOVIE_CRAWL_REQUESTED: 'movie.crawl.requested',
  MOVIE_UPDATED: 'movie.updated',
  MOVIE_CREATED: 'movie.created',
  CACHE_INVALIDATE: 'cache.invalidate',
  TELEMETRY_LOG: 'telemetry.log',
} as const;

export interface CrawlJobMessage {
  jobId: string;
  source: string;
  pages: number;
  fromPage?: number;
  requestedBy: string;
  targetSlug?: string;
  timestamp: string;
}

export interface MovieUpdatedMessage {
  movieId: string;
  slug: string;
  source: string;
  episodeKey?: string;
  action: 'create' | 'update' | 'delete';
  timestamp: string;
}

export interface CacheInvalidateMessage {
  patterns: string[];
  reason?: string;
  timestamp: string;
}
