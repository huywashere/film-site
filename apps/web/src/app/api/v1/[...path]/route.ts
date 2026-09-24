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
