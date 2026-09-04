type NguonCRecord = Record<string, any>;

function normalizeFilmItem(film: NguonCRecord): NguonCRecord {
  const rawCategories = Array.isArray(film.category) ? film.category : [];
  const category = rawCategories.map((categoryItem: any, index: number) =>
    typeof categoryItem === "string"
      ? {
          id: String(index),
          name: categoryItem,
          slug: categoryItem.toLowerCase().replace(/\s+/g, "-"),
        }
      : {
          id: String(categoryItem?.id ?? index),
          name: categoryItem?.name ?? categoryItem,
          slug: categoryItem?.slug ?? "",
        },
  );

  return {
    ...film,
    origin_name: film.original_name ?? film.origin_name ?? "",
    episode_current: film.current_episode ?? film.episode_current ?? "",
    lang: film.language ?? film.lang ?? "",
    actor:
      typeof film.casts === "string"
        ? film.casts
            .split(",")
            .map((item: string) => item.trim())
            .filter(Boolean)
        : Array.isArray(film.actor)
          ? film.actor
          : [],
    director: film.director
      ? typeof film.director === "string"
        ? film.director
            .split(",")
            .map((item: string) => item.trim())
            .filter(Boolean)
        : film.director
      : [],
    category,
    _source: "NguonC",
  };
}

function normalizeEpisodes(episodes: unknown): NguonCRecord[] {
  if (!Array.isArray(episodes)) return [];

  return episodes.map((server: NguonCRecord) => {
    const rawItems = Array.isArray(server.items)
      ? server.items
      : Array.isArray(server.server_data)
        ? server.server_data
        : [];
    return {
      server_name: String(server.server_name ?? "NguonC").replace(/\r?\n|\r/g, " ").trim(),
      server_data: rawItems.map((episode: NguonCRecord) => ({
        name: episode.name ?? "",
        slug: episode.slug ?? "",
        link_embed: episode.embed ?? episode.link_embed ?? "",
        link_m3u8: episode.m3u8 ?? episode.link_m3u8 ?? "",
      })),
    };
  });
}

/** Keep public NguonC responses identical across proxy and browser fallback. */
export function normalizeNguonCPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;

  const payload = raw as NguonCRecord;
  if (Array.isArray(payload.items)) {
    return {
      ...payload,
      items: payload.items.map((item: NguonCRecord) =>
        normalizeFilmItem(item),
      ),
    };
  }

  if (payload.movie && typeof payload.movie === "object") {
    const movie = payload.movie as NguonCRecord;
    const { episodes, ...movieFields } = movie;
    return {
      status: payload.status,
      movie: normalizeFilmItem(movieFields),
      episodes: normalizeEpisodes(episodes),
    };
  }

  return payload;
}
