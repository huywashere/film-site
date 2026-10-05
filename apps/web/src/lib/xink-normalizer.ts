type XinkRecord = Record<string, any>;

function normalizeFilmItem(film: XinkRecord): XinkRecord {
  if (!film || typeof film !== "object") return film;

  const rawCategories = Array.isArray(film.category) ? film.category : [];
  const category = rawCategories.map((cat: any, index: number) =>
    typeof cat === "string"
      ? {
          id: String(index),
          name: cat,
          slug: cat.toLowerCase().replace(/\s+/g, "-"),
        }
      : {
          id: String(cat?.id ?? index),
          name: cat?.name ?? cat,
          slug: cat?.slug ?? "",
        },
  );

  const rawCountries = Array.isArray(film.country) ? film.country : [];
  const country = rawCountries.map((c: any, index: number) =>
    typeof c === "string"
      ? {
          id: String(index),
          name: c,
          slug: c.toLowerCase().replace(/\s+/g, "-"),
        }
      : {
          id: String(c?.id ?? index),
          name: c?.name ?? c,
          slug: c?.slug ?? "",
        },
  );

  return {
    ...film,
    name: film.name || film.title || "",
    origin_name: film.origin_name || film.original_name || "",
    episode_current: film.episode_current || film.current_episode || "",
    thumb_url: film.thumb_url || "",
    poster_url: film.poster_url || "",
    lang: film.lang || film.language || "",
    category,
    country,
    _source: "xink",
  };
}

function normalizeEpisodes(episodes: unknown): XinkRecord[] {
  if (!Array.isArray(episodes)) return [];

  return episodes.map((server: XinkRecord) => {
    const rawItems = Array.isArray(server?.server_data)
      ? server.server_data
      : Array.isArray(server?.items)
        ? server.items
        : [];

    const normalizedData = rawItems.map((ep: XinkRecord) => {
      const name = String(ep?.name || ep?.filename || "").trim();
      const slug = String(ep?.slug || ep?.name || "").trim();
      const filename = String(ep?.filename || ep?.name || "").trim();
      const link_embed = String(ep?.link_embed || ep?.embed || "").trim();
      const link_m3u8 = String(ep?.link_m3u8 || ep?.m3u8 || "").trim();

      return {
        ...ep,
        name,
        slug,
        filename,
        link_embed,
        link_m3u8,
        link_m3u8_proxy: ep?.link_m3u8_proxy || "",
      };
    });

    const serverName = String(server?.server_name || "Xink")
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      ...server,
      server_name: serverName,
      server_data: normalizedData,
      _source: "xink",
    };
  });
}

export function normalizeXinkPayload(raw: any, _path?: string): any {
  if (!raw || typeof raw !== "object") return raw;

  let result = { ...raw };

  // If items array is at root level
  if (Array.isArray(result.items)) {
    result.items = result.items.map(normalizeFilmItem);
  }

  // If movie is at root level
  if (result.movie && typeof result.movie === "object") {
    result.movie = normalizeFilmItem(result.movie);
  }

  // Nested in data wrapper (e.g. data.items, data.movie, data.item)
  if (result.data && typeof result.data === "object") {
    result.data = { ...result.data };
    if (Array.isArray(result.data.items)) {
      result.data.items = result.data.items.map(normalizeFilmItem);
    }
    if (result.data.movie && typeof result.data.movie === "object") {
      result.data.movie = normalizeFilmItem(result.data.movie);
    }
    if (result.data.item && typeof result.data.item === "object") {
      result.data.item = normalizeFilmItem(result.data.item);
    }
    if (Array.isArray(result.data.episodes)) {
      result.data.episodes = normalizeEpisodes(result.data.episodes);
    }
  }

  // Normalize episodes (root level or movie.episodes)
  if (Array.isArray(result.episodes)) {
    result.episodes = normalizeEpisodes(result.episodes);
  } else if (result.movie && Array.isArray(result.movie.episodes)) {
    result.movie.episodes = normalizeEpisodes(result.movie.episodes);
  }

  return result;
}
