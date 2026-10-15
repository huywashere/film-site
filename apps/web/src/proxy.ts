import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const apiOrigin = (() => {
    try {
      return process.env.NEXT_PUBLIC_API_URL
        ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
        : "";
    } catch {
      return "";
    }
  })();
  const apiSocketOrigin = apiOrigin.startsWith("https://")
    ? apiOrigin.replace(/^https:/, "wss:")
    : apiOrigin.startsWith("http://")
      ? apiOrigin.replace(/^http:/, "ws:")
      : "";
  const sentryOrigin = (() => {
    try {
      const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
      return dsn ? new URL(dsn).origin : "";
    } catch {
      return "";
    }
  })();
  const scrubberPreviewOrigin = (() => {
    try {
      return process.env.NEXT_PUBLIC_SCRUBBER_PREVIEW_BASE_URL
        ? new URL(process.env.NEXT_PUBLIC_SCRUBBER_PREVIEW_BASE_URL).origin
        : "";
    } catch {
      return "";
    }
  })();

  const csp = [
    "default-src 'self'",
    // Most public routes are statically generated, so Next's inline bootstrap
    // cannot receive a request-time nonce. Keep script origins tightly scoped,
    // allow the framework bootstrap, and separately disable inline handlers.
    `script-src 'self' 'unsafe-inline'${
      isDevelopment ? " 'unsafe-eval'" : ""
    } https://apis.google.com https://www.gstatic.com https://www.google.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob:${scrubberPreviewOrigin ? ` ${scrubberPreviewOrigin}` : ""} https://image.tmdb.org https://phimimg.com https://*.phimimg.com https://img.phimapi.com https://*.phimapi.com https://img.ophim.live https://*.ophim.live https://ophim1.com https://ophim17.cc https://*.ophim.cc https://phim.nguonc.com https://images.nguonc.com https://*.nguonc.com https://*.vsmov.com https://*.vsphim.com https://vicdn.cc https://*.vicdn.cc https://wsrv.nl https://*.wsrv.nl https://ui-avatars.com https://api.dicebear.com https://cdn.jsdelivr.net https://raw.githubusercontent.com https://flagcdn.com https://*.flagcdn.com https://upload.wikimedia.org https://lh3.googleusercontent.com https://*.googleusercontent.com https://avatars.githubusercontent.com https://platform-lookaside.fbsbx.com https://*.fbsbx.com https://secure.gravatar.com https://motphim.net https://*.motphim.net https://*.onflixcdn.com https://onflixcdn.com https://*.xink.pro https://xink.pro https://www.googletagmanager.com https://*.google-analytics.com https://www.google-analytics.com https://stats.g.doubleclick.net`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}${apiSocketOrigin ? ` ${apiSocketOrigin}` : ""}${
      isDevelopment
        ? " http://localhost:3001 http://127.0.0.1:3001 ws://localhost:3001 ws://127.0.0.1:3001"
        : ""
    }${sentryOrigin ? ` ${sentryOrigin}` : ""}${scrubberPreviewOrigin ? ` ${scrubberPreviewOrigin}` : ""} https://challenges.cloudflare.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://phimapi.com https://*.phimapi.com https://kkphimplayer.com https://*.kkphimplayer.com https://kkphimplayer5.com https://*.kkphimplayer5.com https://kkphimplayer6.com https://*.kkphimplayer6.com https://kkphimplayer7.com https://*.kkphimplayer7.com https://kkphimplayer8.com https://*.kkphimplayer8.com https://phim1280.tv https://*.phim1280.tv https://phim1280.com https://*.phim1280.com https://kvp726.com https://*.kvp726.com https://ophim.live https://*.ophim.live https://ophim1.com https://*.ophim1.com https://ophim17.cc https://*.ophim17.cc https://opstream.com https://*.opstream.com https://opstream12.com https://*.opstream12.com https://opstream14.com https://*.opstream14.com https://opstream15.com https://*.opstream15.com https://phim.nguonc.com https://*.nguonc.com https://streamc.xyz https://embed.streamc.xyz https://*.streamc.xyz https://*.vsmov.com https://*.streamvsmov.com https://*.vsphim.com https://vicdn.cc https://*.vicdn.cc https://vidlink.pro https://*.vidlink.pro https://www.2embed.cc https://*.2embed.cc https://api.2embed.cc https://vidcore.org https://*.vidcore.org https://api.xink.pro https://*.xink.pro https://playembed.vip https://*.playembed.vip https://*.onflixcdn.com https://*.soracdn.com https://soracdn.com https://*.workers.dev https://*.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.google-analytics.com https://www.googletagmanager.com`,
    "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://www.google.com https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://vidsrc.to https://vidsrc.in https://vidsrc.pm https://vidsrc.me https://vidsrc.sbs https://vicdn.cc https://*.vicdn.cc https://ssl.p.jwpcdn.com https://phimapi.com https://*.phimapi.com https://kkphimplayer.com https://*.kkphimplayer.com https://kkphimplayer5.com https://*.kkphimplayer5.com https://kkphimplayer6.com https://*.kkphimplayer6.com https://kkphimplayer7.com https://*.kkphimplayer7.com https://kkphimplayer8.com https://*.kkphimplayer8.com https://phim1280.tv https://*.phim1280.tv https://phim1280.com https://*.phim1280.com https://kvp726.com https://*.kvp726.com https://ophim.live https://*.ophim.live https://ophim1.com https://*.ophim1.com https://ophim17.cc https://*.ophim17.cc https://opstream.com https://*.opstream.com https://opstream12.com https://*.opstream12.com https://opstream14.com https://*.opstream14.com https://opstream15.com https://*.opstream15.com https://phim.nguonc.com https://*.nguonc.com https://streamc.xyz https://embed.streamc.xyz https://*.streamc.xyz https://*.streamembed.me https://*.vipstream.me https://*.vsmov.com https://*.streamvsmov.com https://*.vsphim.com https://vidlink.pro https://*.vidlink.pro https://www.2embed.cc https://*.2embed.cc https://2embed.skin https://*.2embed.skin https://*.videm.xyz https://vidcore.org https://*.vidcore.org https://playembed.vip https://*.playembed.vip https://xink.pro https://*.xink.pro https://www.googletagmanager.com",
    "media-src 'self' blob: data: https://phimapi.com https://*.phimapi.com https://kkphimplayer.com https://*.kkphimplayer.com https://kkphimplayer5.com https://*.kkphimplayer5.com https://kkphimplayer6.com https://*.kkphimplayer6.com https://kkphimplayer7.com https://*.kkphimplayer7.com https://kkphimplayer8.com https://*.kkphimplayer8.com https://phim1280.tv https://*.phim1280.tv https://phim1280.com https://*.phim1280.com https://kvp726.com https://*.kvp726.com https://ophim.live https://*.ophim.live https://ophim1.com https://*.ophim1.com https://ophim17.cc https://*.ophim17.cc https://opstream.com https://*.opstream.com https://opstream12.com https://*.opstream12.com https://opstream14.com https://*.opstream14.com https://opstream15.com https://*.opstream15.com https://phim.nguonc.com https://*.nguonc.com https://streamc.xyz https://embed.streamc.xyz https://*.streamc.xyz https://*.vsmov.com https://*.streamvsmov.com https://*.vsphim.com https://vicdn.cc https://*.vicdn.cc https://*.onflixcdn.com https://*.soracdn.com https://soracdn.com https://*.workers.dev https://*.xink.pro https://playembed.vip https://*.playembed.vip",
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
