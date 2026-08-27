export type MovieSource =
  | "kkphim"
  | "ophim"
  | "nguonc"
  | "vsmov"
  | "vidsrc"
  | "vicdn";

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
  _type?: "vietsub" | "thuyet-minh" | "song-ngu" | "engsub" | "raw";
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
  movie?: {
    title?: string;
    titleEn?: string;
    posterUrl?: string;
    thumbUrl?: string;
    type?: string;
    year?: number;
  };
  movieData?: {
    title?: string;
    titleEn?: string;
    posterUrl?: string;
    thumbUrl?: string;
    type?: string;
    year?: number;
  };
  addedAt?: string;
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
