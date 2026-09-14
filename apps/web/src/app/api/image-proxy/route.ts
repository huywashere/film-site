import { NextRequest, NextResponse } from "next/server";
import { checkImageProxyRateLimitDistributed } from "@/lib/server-rate-limiter";
import { clientIpFromRequest } from "@/lib/client-ip";
import { validateImageUrl } from "@/lib/allowed-image-hosts";
import { lookup } from "node:dns/promises";

export const dynamic = "force-dynamic";

/** Refuse to relay anything larger than this (bytes). */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
/** Abort slow upstreams so a request can't pin a serverless function open. */
const FETCH_TIMEOUT_MS = 3000;
/** A broken poster must never hold a card request for tens of seconds. */
const TOTAL_FALLBACK_BUDGET_MS = 4500;
const FALLBACK_BATCH_SIZE = 3;
const MAX_REDIRECTS = 3;
const PUBLIC_DNS_CACHE_TTL_MS = 60_000;
const publicDnsValidationCache = new Map<
  string,
  { expiresAt: number; validation: Promise<void> }
>();

const RELIABLE_DIRECT_IMAGE_HOSTS = new Set([
  "image.tmdb.org",
  "phimimg.com",
  "img.ophim.live",
  "ophim1.com",
  "images.nguonc.com",
  "phim.nguonc.com",
  "vsmov.com",
  "storage.vsmov.com",
]);

function prioritizeCandidateUrls(urls: string[]): string[] {
  return [...urls].sort((left, right) => {
    const score = (value: string) => {
      try {
        return RELIABLE_DIRECT_IMAGE_HOSTS.has(new URL(value).hostname) ? 0 : 1;
      } catch {
        return 2;
      }
    };
    return score(left) - score(right);
  });
}

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

async function validatePublicDns(hostname: string): Promise<void> {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateAddress(address))
  ) {
    throw new Error("unsafe-address");
  }
}

async function assertPublicDns(url: string): Promise<void> {
  const hostname = new URL(url).hostname.toLowerCase();
  const now = Date.now();
  const cached = publicDnsValidationCache.get(hostname);
  if (cached && cached.expiresAt > now) {
    await cached.validation;
    return;
  }

  const validation = validatePublicDns(hostname).catch((error) => {
    publicDnsValidationCache.delete(hostname);
    throw error;
  });
  publicDnsValidationCache.set(hostname, {
    expiresAt: now + PUBLIC_DNS_CACHE_TTL_MS,
    validation,
  });

  if (publicDnsValidationCache.size > 64) {
    for (const [key, entry] of publicDnsValidationCache) {
      if (entry.expiresAt <= now) publicDnsValidationCache.delete(key);
    }
  }
  await validation;
}

function failedImageResponse(status = 404) {
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

  // Bare paths are relative to default KKPhim/PhimImg CDN
  if (!/^https?:\/\//i.test(imageUrl)) {
    const cleanPath = imageUrl.replace(/^\/+/, "");
    imageUrl = `https://phimimg.com/${cleanPath}`;
  }

  imageUrl = imageUrl.replace(/^http:\/\//i, "https://");

  const ordered: string[] = [imageUrl];

  // KKPhim currently serves both generations of artwork paths. Keep the
  // upstream URL first: new releases use `uploads/movies`, while older titles
  // commonly use `upload/vod`. Rewriting the former eagerly made every new
  // poster a deterministic 404 in production.
  if (imageUrl.includes("/uploads/movies/")) {
    ordered.push(imageUrl.replace("/uploads/movies/", "/upload/vod/"));
  } else if (imageUrl.includes("/upload/vod/")) {
    ordered.push(imageUrl.replace("/upload/vod/", "/uploads/movies/"));
  }

  // Replace invalid img.phimapi.com host with real phimimg.com CDN host
  if (imageUrl.includes("img.phimapi.com/")) {
    ordered.push(imageUrl.replace("img.phimapi.com/", "phimimg.com/"));
  }

  // If path doesn't have upload/vod, try adding common CDN path prefixes
  if (!imageUrl.includes("upload/vod/") && !imageUrl.includes("uploads/")) {
    const urlObj = new URL(imageUrl);
    const cleanPath = urlObj.pathname.replace(/^\/+/, "");
    ordered.push(`https://phimimg.com/upload/vod/${cleanPath}`);
    ordered.push(`https://img.phimapi.com/upload/vod/${cleanPath}`);
    ordered.push(`https://phimimg.com/uploads/movies/${cleanPath}`);
  }

  // Try format and poster/thumb variants
  const extRegex = /\.(jpg|jpeg|webp|png)(?=\?|$)/i;
  const extMatch = imageUrl.match(extRegex);
  if (extMatch) {
    for (const ext of [".jpg", ".webp", ".jpeg", ".png"]) {
      ordered.push(imageUrl.replace(extRegex, ext));
    }
  }
  if (imageUrl.includes("-poster")) {
    ordered.push(imageUrl.replace("-poster", "-thumb"));
  } else if (imageUrl.includes("-thumb")) {
    ordered.push(imageUrl.replace("-thumb", "-poster"));
  }

  // Domain swaps across known movie CDNs
  const domainMap: Record<string, string[]> = {
    "img.phimapi.com": [
      "phimimg.com",
      "ophim1.com",
      "img.ophim.live",
      "images.nguonc.com",
    ],
    "phimimg.com": [
      "img.phimapi.com",
      "ophim1.com",
      "img.ophim.live",
      "images.nguonc.com",
    ],
    "img.ophim.live": [
      "ophim1.com",
      "phimimg.com",
      "img.phimapi.com",
      "images.nguonc.com",
    ],
    "ophim1.com": ["img.ophim.live", "phimimg.com", "img.phimapi.com"],
    "images.nguonc.com": [
      "phimimg.com",
      "img.phimapi.com",
      "ophim1.com",
      "img.ophim.live",
    ],
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
    for (
      let redirectCount = 0;
      redirectCount <= MAX_REDIRECTS;
      redirectCount += 1
    ) {
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
  const rateCheck = await checkImageProxyRateLimitDistributed(
    clientIpFromRequest(request),
  );
  if (!rateCheck.allowed) {
    return failedImageResponse(429);
  }

  const rawUrl = searchParams.get("url");
  const fallbackUrl = searchParams.get("fallback");

  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  const primaryCandidates = generateCandidateUrls(rawUrl).slice(0, 8);
  const fallbackCandidates = fallbackUrl
    ? generateCandidateUrls(fallbackUrl).slice(0, 4)
    : [];
  // Try the original URLs from two independent providers in the first
  // parallel batch. Generated path/format guesses are recovery candidates,
  // not a reason to postpone a known cross-provider fallback.
  const candidateUrls = [
    primaryCandidates[0],
    fallbackCandidates[0],
    ...primaryCandidates.slice(1),
    ...fallbackCandidates.slice(1),
  ].filter((url): url is string => Boolean(url));

  const safeUrls = prioritizeCandidateUrls(candidateUrls)
    .map(validateImageUrl)
    .filter((url): url is string => url !== null);

  if (safeUrls.length === 0) {
    return failedImageResponse(404);
  }

  const deadline = Date.now() + TOTAL_FALLBACK_BUDGET_MS;
  for (
    let offset = 0;
    offset < safeUrls.length;
    offset += FALLBACK_BATCH_SIZE
  ) {
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

  // Return 404 if all candidates fail
  return failedImageResponse(404);
}
