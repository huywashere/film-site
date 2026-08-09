import { NextRequest, NextResponse } from "next/server";
import { checkImageProxyRateLimit } from "@/lib/rate-limiter";
import { clientIpFromRequest } from "@/lib/client-ip";
import { validateImageUrl } from "@/lib/allowed-image-hosts";
import { lookup } from "node:dns/promises";

export const dynamic = "force-dynamic";

/** Refuse to relay anything larger than this (bytes). */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
/** Abort slow upstreams so a request can't pin a serverless function open. */
const FETCH_TIMEOUT_MS = 2200;
/** A broken poster must never hold a card request for tens of seconds. */
const TOTAL_FALLBACK_BUDGET_MS = 5000;
const FALLBACK_BATCH_SIZE = 3;
const MAX_REDIRECTS = 3;

function isPrivateAddress(address: string): boolean {
  const value = address.toLowerCase();
  return (
    /^0\./.test(value) ||
    /^10\./.test(value) ||
    /^127\./.test(value) ||
    /^169\.254\./.test(value) ||
    /^192\.168\./.test(value) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(value) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(value) ||
    value === "::" ||
    value === "::1" ||
    /^(?:fc|fd)/.test(value) ||
    /^fe[89ab]/.test(value) ||
    /^::ffff:(?:127\.|10\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(
      value,
    )
  );
}

async function assertPublicDns(url: string): Promise<void> {
  const hostname = new URL(url).hostname;
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateAddress(address))
  ) {
    throw new Error("unsafe-address");
  }
}

// Fallback dark cinematic poster SVG when all CDNs fail
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="none">
  <rect width="300" height="450" fill="#16181d"/>
  <rect x="15" y="15" width="270" height="420" rx="16" stroke="#2b2f38" stroke-width="2" stroke-dasharray="6 6"/>
  <path d="M150 190C161.046 190 170 181.046 170 170C170 158.954 161.046 150 150 150C138.954 150 130 158.954 130 170C130 181.046 138.954 190 150 190Z" fill="#3a4454"/>
  <path d="M95 275L135 220L160 250L185 210L205 275H95Z" fill="#3a4454"/>
  <text x="150" y="320" fill="#6b7280" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">CineVerse Poster</text>
</svg>`;

function placeholderResponse(maxAge: number) {
  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control":
        maxAge > 0 ? `public, max-age=${maxAge}` : "no-store, max-age=0",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}

function failedImageResponse(strict: boolean, status = 502) {
  if (!strict) return placeholderResponse(status === 429 ? 0 : 300);

  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function generateCandidateUrls(rawUrl: string): string[] {
  let imageUrl = rawUrl.trim();
  if (imageUrl.startsWith("//")) {
    imageUrl = `https:${imageUrl}`;
  }

  // Bare paths are relative to default KKPhim CDN
  if (!/^https?:\/\//i.test(imageUrl)) {
    const cleanPath = imageUrl.replace(/^\/+/, "");
    imageUrl = `https://img.phimapi.com/${cleanPath}`;
  }

  imageUrl = imageUrl.replace(/^http:\/\//i, "https://");

  const ordered: string[] = [imageUrl];

  // Try format and poster/thumb variants on the original host first. These
  // are much more likely to exist than the same path on an unrelated CDN.
  const extRegex = /\.(jpg|jpeg|webp|png)(?=\?|$)/i;
  const extMatch = imageUrl.match(extRegex);
  if (extMatch) {
    for (const ext of [".webp", ".jpg", ".jpeg", ".png"]) {
      ordered.push(imageUrl.replace(extRegex, ext));
    }
  }
  if (imageUrl.includes("-poster")) {
    ordered.push(imageUrl.replace("-poster", "-thumb"));
  } else if (imageUrl.includes("-thumb")) {
    ordered.push(imageUrl.replace("-thumb", "-poster"));
  }

  // 1. Domain swaps across known movie CDNs (include ophim1.com since img.ophim.live can redirect)
  const domainMap: Record<string, string[]> = {
    "img.ophim.live": ["ophim1.com", "phimimg.com", "img.phimapi.com", "images.nguonc.com", "phim.nguonc.com"],
    "ophim1.com": ["img.ophim.live", "phimimg.com", "img.phimapi.com"],
    "img.phimapi.com": ["phimimg.com", "ophim1.com", "img.ophim.live", "images.nguonc.com"],
    "phimimg.com": ["img.phimapi.com", "ophim1.com", "img.ophim.live", "images.nguonc.com"],
    "images.nguonc.com": ["phimimg.com", "img.phimapi.com", "ophim1.com", "img.ophim.live"],
    "phim.nguonc.com": ["images.nguonc.com", "ophim1.com", "phimimg.com", "img.phimapi.com"],
    "vsmov.com": ["storage.vsmov.com"],
  };

  const domainCandidates = [...ordered];
  for (const cand of domainCandidates) {
    for (const [sourceDomain, targets] of Object.entries(domainMap)) {
      if (cand.includes(sourceDomain)) {
        for (const targetDomain of targets) {
          ordered.push(cand.replace(sourceDomain, targetDomain));
        }
      }
    }
  }

  return Array.from(new Set(ordered));
}

type ImageCandidate = {
  buffer: ArrayBuffer;
  contentType: string;
};

async function fetchImageCandidate(
  urlToFetch: string,
  controller: AbortController,
  timeoutMs: number,
): Promise<ImageCandidate> {
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let currentUrl = urlToFetch;
    let res: Response | undefined;
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const validated = validateImageUrl(currentUrl);
      if (!validated) throw new Error("unsafe-url");
      await assertPublicDns(validated);

      res = await fetch(validated, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "image/avif,image/webkit-image,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
        redirect: "manual",
        signal: controller.signal,
        next: { revalidate: 86400 },
      });

      if (res.status < 300 || res.status >= 400) break;
      const location = res.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error("unsafe-redirect");
      }
      const redirected = new URL(location, validated).toString();
      if (!validateImageUrl(redirected)) throw new Error("unsafe-redirect");
      currentUrl = redirected;
    }

    if (!res) throw new Error("empty-response");

    if (!res.ok) throw new Error(`upstream-${res.status}`);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) throw new Error("not-an-image");

    const declaredLength = Number(res.headers.get("content-length") || "0");
    if (declaredLength > MAX_IMAGE_BYTES) throw new Error("image-too-large");

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("image-too-large");
    return { buffer, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const strict = searchParams.get("strict") === "1";
  const rateCheck = checkImageProxyRateLimit(clientIpFromRequest(request));
  if (!rateCheck.allowed) {
    return failedImageResponse(strict, 429);
  }

  const rawUrl = searchParams.get("url");
  const fallbackUrl = searchParams.get("fallback");

  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  const candidateUrls = [
    ...generateCandidateUrls(rawUrl).slice(0, 6),
    ...(fallbackUrl ? generateCandidateUrls(fallbackUrl).slice(0, 6) : []),
  ];

  // Drop anything not on the allowlist before a single request goes out.
  const safeUrls = candidateUrls
    .map(validateImageUrl)
    .filter((url): url is string => url !== null);

  if (safeUrls.length === 0) {
    console.warn(
      `[image-proxy] blocked disallowed host for url parameter: ${rawUrl.slice(0, 200)}`,
    );
    return strict ? failedImageResponse(true) : placeholderResponse(86400);
  }

  const deadline = Date.now() + TOTAL_FALLBACK_BUDGET_MS;
  for (let offset = 0; offset < safeUrls.length; offset += FALLBACK_BATCH_SIZE) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;

    const batch = safeUrls.slice(offset, offset + FALLBACK_BATCH_SIZE);
    const controllers = batch.map(() => new AbortController());
    try {
      const winner = await Promise.any(
        batch.map((url, index) =>
          fetchImageCandidate(
            url,
            controllers[index],
            Math.min(FETCH_TIMEOUT_MS, remainingMs),
          ),
        ),
      );
      return new NextResponse(winner.buffer, {
        headers: {
          "Content-Type": winner.contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'",
        },
      });
    } catch {
      // Move to the next small batch while the shared deadline permits it.
    } finally {
      controllers.forEach((controller) => controller.abort());
    }
  }

  // If all CDN fetch candidates fail, return clean SVG placeholder
  return failedImageResponse(strict);
}
