import { vicdnApi, vodphimApi, movieApi } from '@/lib/api';
import type { FilmItem } from '@/components/film/FilmCard';

export const BILINGUAL_DEFAULT_QUERY_KEY = ['bilingual-films-catalog', 'all', '', '', 1] as const;

export type BilingualFilmsResult = {
  items: FilmItem[];
  totalPages: number;
  totalItems?: number;
};

export async function fetchBilingualFilms({
  format = 'all',
  genre = '',
  search = '',
  page = 1,
}: {
  format?: string;
  genre?: string;
  search?: string;
  page?: number;
}): Promise<BilingualFilmsResult> {
  const trimmed = search.trim();

  // 1. Chế độ tìm kiếm từ khóa
  if (trimmed) {
    const [vodphimRes, movieRes] = await Promise.allSettled([
      vodphimApi.search(trimmed, page, 28),
      movieApi.search(trimmed, page, 28),
    ]);

    const items: FilmItem[] = [];
    const seen = new Set<string>();

    if (vodphimRes.status === 'fulfilled' && vodphimRes.value) {
      const val: any = vodphimRes.value;
      const raw = Array.isArray(val?.data?.items)
        ? val.data.items
        : Array.isArray(val?.items)
          ? val.items
          : [];
      for (const item of raw) {
        if (item.slug && !seen.has(item.slug)) {
          seen.add(item.slug);
          items.push({
            ...item,
            _sourceName: undefined,
            lang: 'Song Ngữ',
            quality: item.quality || 'FHD',
          });
        }
      }
    }

    if (movieRes.status === 'fulfilled' && movieRes.value) {
      const val: any = movieRes.value;
      const raw = Array.isArray(val?.data?.data?.items)
        ? val.data.data.items
        : Array.isArray(val?.data?.items)
          ? val.data.items
          : Array.isArray(val?.items)
            ? val.items
            : [];
      for (const item of raw) {
        if (item.slug && !seen.has(item.slug)) {
          seen.add(item.slug);
          items.push({
            ...item,
            _sourceName: undefined,
            lang: 'Song Ngữ',
            quality: item.quality || 'FHD',
          });
        }
      }
    }

    return {
      items,
      totalPages: Math.min(items.length > 0 ? 10 : 1, 25),
      totalItems: items.length,
    };
  }

  // 2. Chế độ duyệt danh mục & định dạng tổng hợp
  try {
    const targetCat = genre || (format !== 'all' && format !== 'series' && format !== 'single' ? format : '');

    const [vicdnRes, vodphimRes] = await Promise.allSettled([
      targetCat
        ? vicdnApi.getByCategory(targetCat, page)
        : vicdnApi.getLatest(page),
      format === 'series'
        ? vodphimApi.getSeries(page, 24)
        : format === 'single'
          ? vodphimApi.getSingle(page, 24)
          : targetCat
            ? vodphimApi.getByGenre(targetCat, page, 24)
            : vodphimApi.getLatest(page, 24),
    ]);

    let vicdnItems: FilmItem[] = [];
    if (vicdnRes.status === 'fulfilled' && vicdnRes.value) {
      const val: any = vicdnRes.value;
      const raw = Array.isArray(val?.items)
        ? val.items
        : Array.isArray(val?.data)
          ? val.data
          : [];
      vicdnItems = raw.map((item: any) => ({
        ...item,
        _sourceName: undefined,
        lang: 'Song Ngữ',
        quality: item.quality || 'FHD',
      }));
    }

    let vodphimItems: FilmItem[] = [];
    if (vodphimRes.status === 'fulfilled' && vodphimRes.value) {
      const val: any = vodphimRes.value;
      const raw = Array.isArray(val?.data?.items)
        ? val.data.items
        : Array.isArray(val?.items)
          ? val.items
          : [];
      vodphimItems = raw.map((item: any) => ({
        ...item,
        _sourceName: undefined,
        lang: 'Song Ngữ',
        quality: item.quality || 'FHD',
      }));
    }

    // Đan xen mượt mà và loại bỏ trùng lặp slug
    const merged: FilmItem[] = [];
    const seen = new Set<string>();
    const maxLen = Math.max(vicdnItems.length, vodphimItems.length);

    for (let i = 0; i < maxLen; i++) {
      if (i < vicdnItems.length) {
        const it = vicdnItems[i];
        if (it.slug && !seen.has(it.slug)) {
          seen.add(it.slug);
          merged.push(it);
        }
      }
      if (i < vodphimItems.length) {
        const it = vodphimItems[i];
        if (it.slug && !seen.has(it.slug)) {
          seen.add(it.slug);
          merged.push(it);
        }
      }
    }

    return {
      items: merged,
      totalPages: 25,
      totalItems: merged.length * 25,
    };
  } catch {
    return { items: [], totalPages: 1 };
  }
}
