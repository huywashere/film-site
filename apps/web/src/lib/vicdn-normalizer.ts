type ViCDNRecord = Record<string, any>;

function slugify(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFilmItem(film: ViCDNRecord): ViCDNRecord {
  const genres = Array.isArray(film.genre) ? film.genre : [];
  const category = genres.map((g: string, idx: number) => ({
    id: String(idx + 1),
    name: g,
    slug: slugify(g),
  }));

  const countries = Array.isArray(film.country) ? film.country : [];
  const country = countries.map((c: string, idx: number) => ({
    id: String(idx + 1),
    name: c === "CN" ? "Trung Quốc" : c === "KR" ? "Hàn Quốc" : c === "US" ? "Mỹ" : c === "JP" ? "Nhật Bản" : c,
    slug: c.toLowerCase(),
  }));

  const cast = Array.isArray(film.cast)
    ? film.cast.filter((c: string) => !/^\d+$/.test(c)) // filter numeric IDs
    : [];

  const stt = Number(film.stt) || 0;
  const total = Number(film.total) || 0;
  const isFull = stt > 0 && total > 0 && stt >= total;
  const episodeCurrent = isFull
    ? "Full"
    : stt > 0
      ? `Tập ${stt}${total ? "/" + total : ""}`
      : "HD";

  return {
    ...film,
    _id: film.slug || `vicdn-${film.tmdb || Date.now()}`,
    name: film.vname || film.ename || film.name || "",
    origin_name: film.ename || film.vname || "",
    thumb_url: film.banner || film.poster || "",
    poster_url: film.poster || film.banner || "",
    episode_current: episodeCurrent,
    quality: "FHD",
    lang: "Song Ngữ",
    year: Number(film.year) || new Date().getFullYear(),
    time: film.duration ? `${film.duration} phút/tập` : "",
    type: film.type === "tv" ? "series" : "single",
    actor: cast,
    director: [],
    category,
    country,
    content: film.content || "",
    _source: "vicdn",
    _sourceName: "ViCDN",
  };
}

function normalizeEpisodes(listEpisodes: unknown): ViCDNRecord[] {
  if (!Array.isArray(listEpisodes) || listEpisodes.length === 0) return [];

  const episodeItems = listEpisodes.map((item: string) => {
    const parts = String(item).split("|");
    const rawLabel = parts[0]?.trim() || "1";
    const embedUrl = parts[1]?.trim() || "";

    const isFull = /^(full|movie)$/i.test(rawLabel);
    const cleanNum = isFull ? "Full" : rawLabel.replace(/^[^\d]*/, "");

    return {
      name: isFull ? "Tập Full" : `Tập ${rawLabel.padStart(2, "0")}`,
      slug: isFull ? "tap-full" : `tap-${cleanNum || rawLabel}`,
      link_embed: embedUrl,
      link_m3u8: "",
    };
  });

  return [
    {
      server_name: "ViCDN Song Ngữ",
      _type: "song-ngu",
      _source: "vicdn",
      server_data: episodeItems,
    },
  ];
}

/**
 * Normalizes official ViCDN API responses to standard UnifiedMovie / detail format
 */
export function normalizeVicdnPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;

  const payload = raw as ViCDNRecord;

  // Handle explicit error responses from ViCDN (e.g. { status: "error", message: "Movie not found" })
  if (payload.status === "error" || payload.error === true) {
    return {
      status: false,
      error: true,
      message: payload.message || "Không tìm thấy phim",
      movie: null,
      episodes: [],
    };
  }

  // 1. List / Pagination payload (from /api/update/{page} or /api/type/{key}/{page})
  if (Array.isArray(payload.data)) {
    const items = payload.data.map((item: ViCDNRecord) => normalizeFilmItem(item));
    return {
      status: payload.status === "success" || payload.status === true,
      items,
      pagination: {
        totalItems: payload.pagination?.total_records ?? items.length,
        totalItemsPerPage: payload.pagination?.per_page ?? 10,
        currentPage: payload.pagination?.current_page ?? 1,
        pageRanges: payload.pagination?.total_pages ?? 1,
      },
    };
  }

  // 2. Detail payload (from /api/info/{slug})
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    const movieData = payload.data as ViCDNRecord;
    const episodes = normalizeEpisodes(movieData.list_episodes);
    const movie = normalizeFilmItem(movieData);

    return {
      status: payload.status === "success" || payload.status === true,
      movie,
      episodes,
    };
  }

  return payload;
}
