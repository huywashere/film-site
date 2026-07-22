import { createMovieProxyHandler } from '@/lib/movie-proxy';

const KKPHIM_BASE = process.env.KKPHIM_API_BASE || 'https://phimapi.com';

function getTtl(path: string): number {
  if (path.includes('phim-moi-cap-nhat')) return 120;
  if (path.includes('phim/') || path.includes('phim-')) return 600;
  if (path.includes('the-loai') || path.includes('quoc-gia') || path.includes('nam-phat-hanh'))
    return 3600;
  if (path.includes('tim-kiem')) return 60;
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: 'KKPhim',
  cachePrefix: 'kkphim',
  baseUrl: KKPHIM_BASE,
  getTtl,
  maxMemoryEntries: 200,
  upstreamErrorMessage: 'Lỗi kết nối KKPhim API',
});
