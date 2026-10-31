import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'content-encoding',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function getUpstreamBase() {
  const configured = (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(configured)) return null;
  return configured.endsWith('/api') ? `${configured}/v1` : configured;
}

function copyRequestHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);
  headers.delete('host');
  return headers;
}

function firstPartyCookie(cookie: string) {
  return cookie.replace(/;\s*Domain=[^;]+/gi, '');
}

function determineCacheHeaders(request: NextRequest, path: string[]): Record<string, string> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
    };
  }

  // Check for auth headers or user-specific cookies
  const hasAuth = Boolean(
    request.headers.get('authorization') ||
    request.headers.get('x-user-id') ||
    request.headers.get('cookie')?.includes('session') ||
    request.headers.get('cookie')?.includes('token')
  );

  const fullPath = path.join('/').toLowerCase();

  // Private routes that must never be cached
  const isPrivate =
    hasAuth ||
    /(?:^|\/)(auth|user|profile|account|history|bookmarks|favorites|watchlist|rating|comment|telemetry|admin)(?:\/|$)/i.test(
      fullPath,
    );

  if (isPrivate) {
    return {
      'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
    };
  }

  // Public catalog routes with tiered TTLs
  let ttl = 300; // default 5 minutes
  if (/(?:^|\/)(genres|countries|categories)(?:\/|$)/i.test(fullPath)) {
    ttl = 86400; // 24 hours for static taxonomy
  } else if (/(?:^|\/)(trending|top-rated|home)(?:\/|$)/i.test(fullPath)) {
    ttl = 600; // 10 minutes
  } else if (/(?:^|\/)latest(?:\/|$)/i.test(fullPath)) {
    ttl = 180; // 3 minutes
  } else if (/^films\/[^/]+$/i.test(fullPath)) {
    ttl = 900; // 15 minutes for movie details
  }

  const swr = Math.min(ttl * 2, 3600);
  const browserTtl = Math.min(ttl, 60);

  return {
    'Cache-Control': `public, max-age=${browserTtl}, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
    'CDN-Cache-Control': `public, max-age=${ttl}, stale-while-revalidate=${swr}`,
    'Cloudflare-CDN-Cache-Control': `public, max-age=${ttl}, stale-while-revalidate=${swr}`,
  };
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const isTelemetry = path.join('/') === 'telemetry/client/batch';
  const upstreamBase = getUpstreamBase();
  if (!upstreamBase) {
    if (isTelemetry) return new NextResponse(null, { status: 204 });
    return NextResponse.json(
      { message: 'API upstream is not configured' },
      { status: 503 },
    );
  }

  const suffix = path.map(encodeURIComponent).join('/');
  const upstreamUrl = new URL(`${upstreamBase}/${suffix}`);
  upstreamUrl.search = request.nextUrl.search;

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: copyRequestHeaders(request),
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    if (isTelemetry) return new NextResponse(null, { status: 204 });
    return NextResponse.json(
      { message: 'API upstream is temporarily unavailable' },
      { status: 502 },
    );
  }

  if (isTelemetry && !upstreamResponse.ok) {
    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, name) => {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && name !== 'set-cookie') {
      responseHeaders.set(name, value);
    }
  });

  const getSetCookie = (
    upstreamResponse.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const cookies = getSetCookie
    ? getSetCookie.call(upstreamResponse.headers)
    : upstreamResponse.headers.get('set-cookie')
      ? [upstreamResponse.headers.get('set-cookie') as string]
      : [];
  cookies.forEach((cookie) =>
    responseHeaders.append('set-cookie', firstPartyCookie(cookie)),
  );

  if (upstreamResponse.status === 200) {
    const cacheHeaders = determineCacheHeaders(request, path);
    Object.entries(cacheHeaders).forEach(([name, value]) => {
      responseHeaders.set(name, value);
    });
  } else {
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    responseHeaders.set('CDN-Cache-Control', 'no-store');
    responseHeaders.set('Cloudflare-CDN-Cache-Control', 'no-store');
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
