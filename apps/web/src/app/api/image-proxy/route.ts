import { NextRequest, NextResponse } from 'next/server';
import { checkImageProxyRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const rateCheck = checkImageProxyRateLimit(ip);
  if (!rateCheck.allowed) {
    return new NextResponse('Too many image requests. Please slow down.', {
      status: 429,
      headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) },
    });
  }

  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Basic validation that we are only proxying image links
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return new NextResponse('Invalid image url', { status: 400 });
  }

  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 86400 }, // Cache on Next.js edge for 24 hours
    });

    if (!res.ok) {
      return new NextResponse(`Failed to fetch image: ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache in browser
      },
    });
  } catch (err: any) {
    console.error('Image proxy error:', err.message);
    return new NextResponse('Error loading image', { status: 500 });
  }
}
