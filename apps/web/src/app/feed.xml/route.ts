import { NextResponse } from 'next/server';

const KKPHIM_BASE = process.env.KKPHIM_API_BASE || 'https://phimapi.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET() {
  try {
    // Fetch directly from upstream API server-side
    const res = await fetch(`${KKPHIM_BASE}/danh-sach/phim-moi-cap-nhat?page=1`, {
      next: { revalidate: 600 },
    });
    const data = await res.json();
    const films = data?.items || [];

    const feedItems = films
      .map((film: any) => {
        const title = film.name || film.title || '';
        const link = `${SITE_URL}/film/${film.slug}`;
        
        let pubDate = new Date().toUTCString();
        if (film.modified) {
          const parsed = new Date(film.modified);
          if (!isNaN(parsed.getTime())) {
            pubDate = parsed.toUTCString();
          }
        }

        const description = `Xem phim ${title} chất lượng cao, thuyết minh, vietsub tại CineVerse.`;

        return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
      })
      .join('\n');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>CineVerse - Xem Phim Thuyết Minh, Vietsub Mới Nhất</title>
    <link>${SITE_URL}</link>
    <description>CineVerse cung cấp kho phim mới, phim bộ, phim lẻ, hoạt hình vietsub và thuyết minh chất lượng cao, cập nhật liên tục.</description>
    <language>vi</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${feedItems}
  </channel>
</rss>`;

    return new Response(rssFeed, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('Failed to generate RSS feed:', err);
    return new Response('<error>Failed to generate RSS feed</error>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
