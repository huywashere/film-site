import { NextRequest, NextResponse } from "next/server";
import { checkImageProxyRateLimit } from "@/lib/rate-limiter";
import { clientIpFromRequest } from "@/lib/client-ip";
import { validateImageUrl } from "@/lib/allowed-image-hosts";

export const dynamic = "force-dynamic";

/** Refuse to relay anything larger than this (bytes). */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
/** Abort slow upstreams so a request can't pin a serverless function open. */
const FETCH_TIMEOUT_MS = 8000;

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
      // The placeholder is static markup we control, but be explicit anyway.
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
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

  let imageUrl = rawUrl.trim();
  if (imageUrl.startsWith("//")) {
    imageUrl = `https:${imageUrl}`;
  }

  // Bare paths are relative to the default KKPhim CDN.
  if (!/^https?:\/\//i.test(imageUrl)) {
    const cleanPath = imageUrl.replace(/^\/+/, "");
    imageUrl = `https://img.phimapi.com/${cleanPath}`;
  }

  // Upgrade plain http to https so the allowlist check can't be sidestepped
  // with an http:// URL that later redirects somewhere internal.
  imageUrl = imageUrl.replace(/^http:\/\//i, "https://");

  // Generate fallback candidate URLs across KKPhim, OPhim, and NguonC CDNs
  const candidateUrls: string[] = [imageUrl];

  if (imageUrl.includes("img.phimapi.com")) {
    candidateUrls.push(imageUrl.replace("img.phimapi.com", "phimimg.com"));
    candidateUrls.push(
      imageUrl.replace("img.phimapi.com", "images.nguonc.com"),
    );
  } else if (imageUrl.includes("phimimg.com")) {
    candidateUrls.push(imageUrl.replace("phimimg.com", "img.phimapi.com"));
    candidateUrls.push(imageUrl.replace("phimimg.com", "images.nguonc.com"));
  } else if (imageUrl.includes("images.nguonc.com")) {
    candidateUrls.push(imageUrl.replace("images.nguonc.com", "phimimg.com"));
    candidateUrls.push(
      imageUrl.replace("images.nguonc.com", "img.phimapi.com"),
    );
  }

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
        // Never follow a redirect — an allowlisted CDN could otherwise bounce
        // us to an internal address and defeat the host check above.
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 86400 }, // Cache on Next.js edge for 24 hours
      });

      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "";
      // Only relay real images. Without this the proxy happily returns HTML or
      // JSON from an upstream, which is how an open proxy gets abused.
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
          // An allowlisted CDN could still serve a scriptable SVG; sandbox it.
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'",
        },
      });
    } catch (err: any) {
      console.warn(`Image proxy fetch notice for ${urlToFetch}:`, err.message);
    }
  }

  // If all CDN fetch candidates fail, return clean SVG placeholder instead of broken 404/500 image
  return placeholderResponse(86400);
}
