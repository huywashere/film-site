// Xử lý lịch phát sóng và tính toán thông báo tập mới cho phim bộ/anime/phim sắp chiếu
export interface EpisodeAirInfo {
  isUpcoming: boolean;
  type: "series" | "single";
  nextEpisode: number;
  episodeLabel: string; // e.g. "Tập 8" hoặc "Bản Full HD"
  airDateStr: string;   // e.g. "11-09-2026"
  message: string;      // Full notification text
}

export function parseCurrentEpisodeNumber(episodeCurrent?: string): number | null {
  if (!episodeCurrent) return null;
  const clean = episodeCurrent.trim();
  const match = clean.match(/(?:Tập|Tap|Ep\.?|E)?\s*([0-9]+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
}

export function isCompletedFilm(status?: string, episodeCurrent?: string): boolean {
  if (status === "completed") return true;
  const ep = (episodeCurrent || "").toLowerCase().trim();
  if (
    ep.includes("full") ||
    ep.includes("hoàn tất") ||
    ep.includes("trọn bộ") ||
    ep.includes("end") ||
    ep.startsWith("hoàn thành")
  ) {
    return true;
  }
  return false;
}

/**
 * Tính toán tập tiếp theo và ngày phát sóng dựa vào:
 * 1. TMDB TV next_episode_to_air (nếu còn trong tương lai)
 * 2. Phân bổ lịch định kỳ tuần của series/anime
 * 3. Phim lẻ sắp chiếu / trailer
 */
export function calculateNextAirInfo(
  film?: {
    name?: string;
    slug?: string;
    type?: string;
    status?: string;
    episode_current?: string;
    episode_total?: string;
    tmdb?: any;
    year?: number | string;
  } | null,
  episodes?: any[],
  baseDate: Date = new Date(),
): EpisodeAirInfo | null {
  if (!film) return null;

  // Nếu phim đã hoàn tất trọn bộ thì không cần hiển thị thông báo phát sóng
  if (isCompletedFilm(film.status, film.episode_current)) {
    return null;
  }

  // Kiểm tra nếu là phim lẻ sắp chiếu (trailer / upcoming)
  const isUpcomingSingle =
    (film.type === "single" || film.type === "movie") &&
    (film.status === "trailer" ||
      film.status === "upcoming" ||
      (film.episode_current && film.episode_current.toLowerCase().includes("trailer")));

  const isSeries =
    film.type === "series" ||
    film.type === "hoat-hinh" ||
    film.type === "tv" ||
    film.type === "tvshows" ||
    Boolean(film.episode_current && !isCompletedFilm(film.status, film.episode_current));

  if (!isSeries && !isUpcomingSingle) {
    return null;
  }

  // Xác định số tập hiện tại
  let currentEpNum = parseCurrentEpisodeNumber(film.episode_current);
  const serverEpsCount =
    Array.isArray(episodes) && episodes[0]?.server_data?.length
      ? episodes[0].server_data.length
      : 0;

  if (serverEpsCount > 0 && (!currentEpNum || serverEpsCount > currentEpNum)) {
    currentEpNum = serverEpsCount;
  }

  // Kiểm tra nếu đã đạt tổng số tập (episode_total)
  if (film.episode_total) {
    const totalMatch = film.episode_total.match(/([0-9]+)/);
    if (totalMatch) {
      const total = parseInt(totalMatch[1], 10);
      if (total > 0 && (currentEpNum || 0) >= total) {
        return null;
      }
    }
  }

  const nextEp = isUpcomingSingle ? 1 : (currentEpNum || 1) + 1;
  const episodeLabel = isUpcomingSingle ? "Bản Full HD" : `Tập ${nextEp}`;

  // Xác định ngày phát sóng tiếp theo
  let airDateStr = "";
  const tmdbNextAir = film.tmdb?.next_episode_to_air?.air_date;
  if (tmdbNextAir && typeof tmdbNextAir === "string") {
    const parts = tmdbNextAir.split("-");
    if (parts.length === 3) {
      const tmdbYear = parseInt(parts[0], 10);
      const tmdbMonth = parseInt(parts[1], 10) - 1;
      const tmdbDay = parseInt(parts[2], 10);
      const tmdbDate = new Date(tmdbYear, tmdbMonth, tmdbDay);
      // Chỉ dùng TMDB air date nếu là ngày trong tương lai hoặc hôm nay
      if (tmdbDate.getTime() >= baseDate.getTime() - 24 * 60 * 60 * 1000) {
        airDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
  }

  if (!airDateStr) {
    // Phân bổ ngày phát sóng theo lịch tuần
    const lowerName = (film.name || "").toLowerCase();
    const lowerSlug = (film.slug || "").toLowerCase();

    let targetDay: number;
    if (lowerSlug.includes("one-piece") || lowerName.includes("đảo hải tặc")) {
      targetDay = 0; // Chủ Nhật
    } else if (lowerSlug.includes("conan") || lowerName.includes("thám tử lừng danh")) {
      targetDay = 6; // Thứ Bảy
    } else if (lowerSlug.includes("sat-thu") || lowerName.includes("cửa hàng sát thủ")) {
      targetDay = 3; // Thứ Tư
    } else if (lowerSlug.includes("solo-leveling") || lowerName.includes("tôi thăng cấp")) {
      targetDay = 6; // Thứ Bảy
    } else if (lowerSlug.includes("jujutsu") || lowerName.includes("chú thuật")) {
      targetDay = 4; // Thứ Năm
    } else {
      const seed = (film.slug || film.name || "")
        .split("")
        .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      targetDay = seed % 7;
    }

    const currentDay = baseDate.getDay();
    let diff = (targetDay - currentDay + 7) % 7;
    if (diff === 0) diff = 7; // Nếu trùng ngày thì thông báo ngày phát sóng tuần sau

    const nextDate = new Date(baseDate.getTime() + diff * 24 * 60 * 60 * 1000);
    const dd = String(nextDate.getDate()).padStart(2, "0");
    const mm = String(nextDate.getMonth() + 1).padStart(2, "0");
    const yyyy = nextDate.getFullYear();
    airDateStr = `${dd}-${mm}-${yyyy}`;
  }

  return {
    isUpcoming: true,
    type: isUpcomingSingle ? "single" : "series",
    nextEpisode: nextEp,
    episodeLabel,
    airDateStr,
    message: `${episodeLabel} sẽ phát sóng ngày ${airDateStr}. Các bạn nhớ đón xem nhé 😚`,
  };
}
