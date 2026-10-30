import {
  currentAdminSessionEpoch,
  endAdminSession,
} from "@/lib/admin-session-client";

export interface AdminFetchOptions extends RequestInit {
  bypassCache?: boolean;
  cacheTtlMs?: number;
}

type CacheEntry = {
  timestamp: number;
  data: unknown;
};

// In-memory cache for fast, instant client navigation and request deduplication
const memoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

const DEFAULT_CACHE_TTL_MS = 6000; // 6 seconds SWR cache for GET reads

export function invalidateAdminCache(pathPattern?: string) {
  if (!pathPattern) {
    memoryCache.clear();
    return;
  }
  memoryCache.forEach((_, key) => {
    if (key.includes(pathPattern)) {
      memoryCache.delete(key);
    }
  });
}

export async function adminFetch<T>(
  path: string,
  init?: AdminFetchOptions,
): Promise<T> {
  const cleanPath = path.replace(/^\/+/, "");
  const method = (init?.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const bypassCache = init?.bypassCache ?? false;
  const cacheTtl = init?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  // Mutations automatically invalidate cache to ensure instant, accurate updates
  if (!isGet) {
    invalidateAdminCache();
  }

  // 1. Instant Cache Hit for GET requests
  if (isGet && !bypassCache) {
    const cached = memoryCache.get(cleanPath);
    if (cached && Date.now() - cached.timestamp < cacheTtl) {
      return cached.data as T;
    }
  }

  // 2. Request Deduplication for concurrent in-flight GET requests
  if (isGet && inFlightRequests.has(cleanPath) && !bypassCache) {
    return inFlightRequests.get(cleanPath)! as Promise<T>;
  }

  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const sessionEpoch =
    typeof window !== "undefined" ? currentAdminSessionEpoch() : null;

  const fetchPromise = (async () => {
    try {
      const response = await fetch(`/api/admin/${cleanPath}`, {
        ...init,
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (
          response.status === 401 &&
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          endAdminSession();
          fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
          window.location.assign("/login?session_expired=1");
          return new Promise(() => {}) as Promise<T>;
        }
        throw new Error(
          payload?.message || `Yêu cầu thất bại (HTTP ${response.status})`,
        );
      }

      // Store in memory cache for instant subsequent reads
      if (isGet) {
        memoryCache.set(cleanPath, {
          timestamp: Date.now(),
          data: payload,
        });
      }

      return payload as T;
    } finally {
      if (isGet) {
        inFlightRequests.delete(cleanPath);
      }
    }
  })();

  if (isGet) {
    inFlightRequests.set(cleanPath, fetchPromise);
  }

  return fetchPromise;
}

export function queryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
}
