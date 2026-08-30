export type MovieSource = 'kkphim' | 'ophim' | 'nguonc' | 'vsmov' | 'vidsrc' | 'vicdn';

export interface NamedValue {
  name?: string;
  slug?: string;
}

export interface Episode {
  name: string;
  slug: string;
  link_embed?: string;
  link_m3u8?: string;
  link_m3u8_proxy?: string;
  filename?: string;
}

export interface EpisodeServer {
  server_name: string;
  server_data: Episode[];
  _source?: MovieSource;
  _type?: 'vietsub' | 'thuyet-minh' | 'song-ngu' | 'engsub' | 'raw';
}

export interface UnifiedMovie {
  _id?: string;
  id?: string;
  slug: string;
  name: string;
  title?: string;
  origin_name?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: number;
  type?: string;
  episode_current?: string;
  quality?: string;
  lang?: string;
  content?: string;
  category?: NamedValue[];
  country?: NamedValue[];
  _source?: MovieSource;
  _sources?: MovieSource[];
  _sourceSlugs?: Partial<Record<MovieSource, string>>;
}

export interface MovieDetail extends UnifiedMovie {
  episodes?: EpisodeServer[];
  actor?: string[];
  director?: string[];
  trailer_url?: string;
  time?: string;
  status?: string;
}

export interface WatchlistItem {
  id: string;
  movieId: string;
  movie?: MovieSnapshot;
  movieData?: MovieSnapshot;
  addedAt?: string;
}

export interface MovieSnapshot {
  title?: string;
  titleEn?: string;
  posterUrl?: string;
  thumbUrl?: string;
  type?: string;
  year?: number;
}

export interface WatchHistoryItem {
  id: string;
  movieId: string;
  episode?: string;
  progress: number;
  duration: number;
  movieTitle: string;
  movieThumb?: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  totalPages?: number;
  pages?: number;
  limit?: number;
}

export interface ServiceHealth {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
}

export type ProviderStatus = 'operational' | 'degraded' | 'down';

export interface ProviderQuota {
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  percentUsed: number;
  cacheHits?: number;
  nextResetFormatted: string;
  nextResetIso: string;
}

export interface ProviderHealth {
  id: string;
  name: string;
  role: string;
  status: ProviderStatus;
  latencyMs: number;
  httpStatus: number | null;
  message: string;
  quota?: ProviderQuota;
}

export interface ProviderHealthPayload {
  status: ProviderStatus;
  checkedAt: string;
  summary: {
    total: number;
    operational: number;
    degraded: number;
    down: number;
  };
  proxy?: {
    status: ProviderStatus;
    message: string;
  };
  providers: ProviderHealth[];
}

export type HlsAnalysisMarkerKind = 'intro' | 'ad';

export interface HlsAnalysisMarker {
  kind: HlsAnalysisMarkerKind;
  startSeconds: number;
  durationSeconds?: number;
  source: string;
}

export interface HlsAnalysisVariant {
  url: string;
  bandwidth?: number;
  resolution?: string;
}

export interface HlsAnalysisJob {
  jobId: string;
  url: string;
  provider?: string;
  movieSlug?: string;
  episode?: string;
  requestedAt: number;
}

export interface HlsAnalysisResult {
  schemaVersion: 1;
  jobId: string;
  url: string;
  finalUrl: string;
  provider: string;
  movieSlug: string;
  episode: string;
  playlistKind: 'master' | 'media' | 'unknown';
  playable: boolean;
  healthScore: number;
  durationSeconds: number;
  segmentCount: number;
  sampledSegments: number;
  brokenSegments: string[];
  variants: HlsAnalysisVariant[];
  adMarkers: HlsAnalysisMarker[];
  introMarkers: HlsAnalysisMarker[];
  discontinuities: number;
  manifestLatencyMs: number;
  analyzedAt: number;
  errors: string[];
}
