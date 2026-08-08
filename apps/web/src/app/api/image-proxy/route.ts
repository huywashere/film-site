import { NextRequest, NextResponse } from "next/server";
import { checkImageProxyRateLimit } from "@/lib/rate-limiter";
import { clientIpFromRequest } from "@/lib/client-ip";
import { validateImageUrl } from "@/lib/allowed-image-hosts";

export const dynamic = "force-dynamic";

/** Refuse to relay anything larger than this (bytes). */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
/** Abort slow upstreams so a request can't pin a serverless function open. */
const FETCH_TIMEOUT_MS = 3000;

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

  // 2. Extension swaps (.webp, .jpg, .png, .jpeg)
  const extRegex = /\.(jpg|jpeg|webp|png)$/i;
  const currentList = [...ordered];
  for (const cand of currentList) {
    const match = cand.match(extRegex);
    if (match) {
      const currentExt = match[0].toLowerCase();
      const alternatives = [".webp", ".jpg", ".png", ".jpeg"].filter(
        (ext) => ext !== currentExt,
      );
      for (const ext of alternatives) {
        ordered.push(cand.replace(extRegex, ext));
      }
    } else {
      ordered.push(`${cand}.webp`, `${cand}.jpg`, `${cand}.png`);
    }
  }

  // 3. Poster / Thumb keyword swaps
  const postThumbList = [...ordered];
  for (const cand of postThumbList) {
    if (cand.includes("-poster")) {
      ordered.push(cand.replace("-poster", "-thumb"));
    } else if (cand.includes("-thumb")) {
      ordered.push(cand.replace("-thumb", "-poster"));
    }
  }

  return Array.from(new Set(ordered));
}

export async function GET(request: NextRequest) {
  const rateCheck = checkImageProxyRateLimit(clientIpFromRequest(request));
  if (!rateCheck.allowed) {
    return placeholderResponse(0);
  }

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  const candidateUrls = generateCandidateUrls(rawUrl);

  // Drop anything not on the allowlist before a single request goes out.
  const safeUrls = candidateUrls
    .map(validateImageUrl)
    .filter((url): url is string => url !== null);

  if (safeUrls.length === 0) {
    console.warn(
      `[image-proxy] blocked disallowed host for url parameter: ${rawUrl.slice(0, 200)}`,
    );
    return placeholderResponse(86400);
  }

  for (const urlToFetch of safeUrls) {
    try {
      const res = await fetch(urlToFetch, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "image/avif,image/webkit-image,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 86400 },
      });

      if (!res.ok) continue;

      // Ensure redirected final URL stays within allowed hosts & isn't a Cloudflare abuse page
      if (res.url) {
        if (!validateImageUrl(res.url) || res.url.includes("abuse")) {
          console.warn(`[image-proxy] redirected to disallowed/abuse host: ${res.url}`);
          continue;
        }
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        console.warn(
          `[image-proxy] refused non-image content-type "${contentType}" from ${urlToFetch}`,
        );
        continue;
      }

      const declaredLength = Number(res.headers.get("content-length") || "0");
      if (declaredLength > MAX_IMAGE_BYTES) continue;

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > MAX_IMAGE_BYTES) continue;

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'",
        },
      });
    } catch (err: any) {
      console.warn(`Image proxy fetch notice for ${urlToFetch}:`, err.message);
    }
  }

  // If all CDN fetch candidates fail, return clean SVG placeholder
  return placeholderResponse(86400);
}
