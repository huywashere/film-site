import { NextRequest, NextResponse } from 'next/server';
import { checkImageProxyRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// Fallback dark cinematic poster SVG when all CDNs fail
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="none">
  <rect width="300" height="450" fill="#16181d"/>
  <rect x="15" y="15" width="270" height="420" rx="16" stroke="#2b2f38" stroke-width="2" stroke-dasharray="6 6"/>
  <path d="M150 190C161.046 190 170 181.046 170 170C170 158.954 161.046 150 150 150C138.954 150 130 158.954 130 170C130 181.046 138.954 190 150 190Z" fill="#3a4454"/>
  <path d="M95 275L135 220L160 250L185 210L205 275H95Z" fill="#3a4454"/>
  <text x="150" y="320" fill="#6b7280" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">CineVerse Poster</text>
</svg>`;

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const rateCheck = checkImageProxyRateLimit(ip);
  if (!rateCheck.allowed) {
    return new NextResponse(PLACEHOLDER_SVG, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' },
    });
  }

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let imageUrl = rawUrl.trim();
  if (imageUrl.startsWith('//')) {
    imageUrl = `https:${imageUrl}`;
  }

  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    imageUrl = `https://img.phimapi.com/${cleanPath}`;
  }

  // Generate fallback candidate URLs across KKPhim, OPhim, and NguonC CDNs
  const candidateUrls: string[] = [imageUrl];

  if (imageUrl.includes('img.phimapi.com')) {
    candidateUrls.push(imageUrl.replace('img.phimapi.com', 'phimimg.com'));
    candidateUrls.push(imageUrl.replace('img.phimapi.com', 'images.nguonc.com'));
  } else if (imageUrl.includes('phimimg.com')) {
    candidateUrls.push(imageUrl.replace('phimimg.com', 'img.phimapi.com'));
    candidateUrls.push(imageUrl.replace('phimimg.com', 'images.nguonc.com'));
  } else if (imageUrl.includes('images.nguonc.com')) {
    candidateUrls.push(imageUrl.replace('images.nguonc.com', 'phimimg.com'));
    candidateUrls.push(imageUrl.replace('images.nguonc.com', 'img.phimapi.com'));
  }

  for (const urlToFetch of candidateUrls) {
    try {
      const res = await fetch(urlToFetch, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webkit-image,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        next: { revalidate: 86400 }, // Cache on Next.js edge for 24 hours
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const buffer = await res.arrayBuffer();

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (err: any) {
      console.warn(`Image proxy fetch notice for ${urlToFetch}:`, err.message);
    }
  }

  // If all CDN fetch candidates fail, return clean SVG placeholder instead of broken 404/500 image
  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
