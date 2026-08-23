import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const apiOrigin = (() => {
    try {
      return process.env.NEXT_PUBLIC_API_URL
        ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
        : "https://victorious-possibility-production-aba7.up.railway.app";
    } catch {
      return "https://victorious-possibility-production-aba7.up.railway.app";
    }
  })();

  const csp = [
    "default-src 'self'",
    // Most public routes are statically generated, so Next's inline bootstrap
    // cannot receive a request-time nonce. Keep script origins tightly scoped,
    // allow the framework bootstrap, and separately disable inline handlers.
    `script-src 'self' 'unsafe-inline'${
      isDevelopment ? " 'unsafe-eval'" : ""
    } https://apis.google.com https://www.gstatic.com https://www.google.com https://challenges.cloudflare.com`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https: wss: https://victorious-possibility-production-aba7.up.railway.app wss://victorious-possibility-production-aba7.up.railway.app${apiOrigin && apiOrigin !== "https://victorious-possibility-production-aba7.up.railway.app" ? ` ${apiOrigin}` : ""}${
      isDevelopment
        ? " http://localhost:3001 http://127.0.0.1:3001 ws://localhost:3001 ws://127.0.0.1:3001"
        : ""
    } https://challenges.cloudflare.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com`,
    "frame-src 'self' https: http: https://accounts.google.com https://*.firebaseapp.com https://www.google.com https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://vidsrc.to https://vidsrc.in https://vidsrc.pm https://vidsrc.me https://vidsrc.sbs https://*.phimapi.com https://*.kkphimplayer7.com https://*.ophim.live https://ophim1.com https://*.opstream12.com https://*.nguonc.com https://*.streamc.xyz https://*.streamembed.me https://*.vipstream.me https://*.vsmov.com https://*.streamvsmov.com",
    "media-src 'self' blob: https: http: data:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
