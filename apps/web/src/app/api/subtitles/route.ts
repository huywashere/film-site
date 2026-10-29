import { NextRequest, NextResponse } from 'next/server';
import {
  decryptSubtitle,
  parseSubtitleCues,
  mergeDualSubtitleCues,
  buildWebVttString,
} from '@/lib/subtitles/dual-subtitles';

export const dynamic = 'force-dynamic';

import { lookup } from 'node:dns/promises';

const SUBTITLE_TIMEOUT_MS = 6000;
const MAX_SUBTITLE_BYTES = 5 * 1024 * 1024; // 5 MB

function isPrivateIp(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.')
  ) {
    return true;
  }
  if (hostname.startsWith('172.')) {
    const second = parseInt(hostname.split('.')[1] || '0', 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

async function isPrivateHost(hostname: string): Promise<boolean> {
  if (isPrivateIp(hostname)) return true;
  try {
    const resolved = await lookup(hostname);
    if (resolved?.address && isPrivateIp(resolved.address)) return true;
  } catch {
    return true; // Fail closed if DNS resolution fails
  }
  return false;
}

async function fetchSubtitleContent(targetUrl: string): Promise<string> {
  const parsed = new URL(targetUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Chỉ hỗ trợ giao thức HTTP/HTTPS');
  }
  if (await isPrivateHost(parsed.hostname)) {
    throw new Error('Không được phép truy cập địa chỉ IP nội bộ');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUBTITLE_TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/vtt,text/plain,*/*',
      },
    });

    if (!res.ok) {
      throw new Error(`Upstream returned ${res.status}`);
    }

    const raw = await res.text();
    if (raw.length > MAX_SUBTITLE_BYTES) {
      throw new Error('Kích thước tệp phụ đề vượt quá giới hạn cho phép');
    }

    return decryptSubtitle(raw);
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url1 = searchParams.get('url') || searchParams.get('url1');
  const id1 = searchParams.get('id') || searchParams.get('id1');
  const url2 = searchParams.get('url2');
  const id2 = searchParams.get('id2');
  const mode = searchParams.get('mode'); // 'single' | 'dual'

  const cfWorkerUrl = (
    process.env.NEXT_PUBLIC_CF_MEDIA_WORKER_URL ||
    process.env.CF_MEDIA_WORKER_URL ||
    process.env.SUBTITLES_CLOUDFLARE_WORKER_URL ||
    ""
  ).trim().replace(/\/$/, "");

  // If worker is configured and request is single subtitle URL, offload directly to worker
  if (cfWorkerUrl && url1 && !url2 && mode !== 'dual') {
    const target = `${cfWorkerUrl}/subtitles?${searchParams.toString()}`;
    return NextResponse.redirect(target, 307);
  }

  // 1. Offload to Go Media Gateway if online (Zero-allocation high performance parser)
  const mediaGatewayUrl = (
    process.env.MEDIA_GATEWAY_INTERNAL_URL ||
    process.env.MEDIA_GATEWAY_URL ||
    'http://127.0.0.1:8081'
  ).replace(/\/$/, '');

  try {
    const goGatewayRes = await fetch(`${mediaGatewayUrl}/v1/subtitles?${searchParams.toString()}`, {
      signal: AbortSignal.timeout(3000),
      headers: { Accept: 'text/vtt' },
    });
    if (goGatewayRes.ok) {
      const vtt = await goGatewayRes.text();
      return new NextResponse(vtt, {
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*',
          'X-Source': 'Go-Media-Gateway',
        },
      });
    }
  } catch {
    // Go gateway unavailable, fallback smoothly to local TypeScript parser
  }

  let targetUrl1 = url1;
  if (!targetUrl1 && id1) {
    targetUrl1 = `https://tophim.top/api/subtitles/play?id=${id1}`;
  }

  if (!targetUrl1) {
    return new NextResponse('Thiếu tham số url hoặc id phụ đề', { status: 400 });
  }

  try {
    const text1 = await fetchSubtitleContent(targetUrl1);

    // If dual mode requested with secondary sub
    let targetUrl2 = url2;
    if (!targetUrl2 && id2) {
      targetUrl2 = `https://tophim.top/api/subtitles/play?id=${id2}`;
    }

    if (mode === 'dual' && targetUrl2) {
      const text2 = await fetchSubtitleContent(targetUrl2);
      const cues1 = parseSubtitleCues(text1);
      const cues2 = parseSubtitleCues(text2);
      const merged = mergeDualSubtitleCues(cues1, cues2);
      const vtt = buildWebVttString(merged);

      return new NextResponse(vtt, {
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Single subtitle output
    return new NextResponse(text1, {
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new NextResponse(`Lỗi tải phụ đề: ${err?.message || 'Không rõ nguyên nhân'}`, {
      status: 502,
    });
  }
}
