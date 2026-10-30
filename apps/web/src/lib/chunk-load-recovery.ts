const CHUNK_RELOAD_PARAM = "__netphim_chunk_reload";
const CHUNK_RECOVERY_STORAGE_KEY = "netphim:chunk-load-recovery";
const RECOVERY_COOLDOWN_MS = 30_000;

type ErrorLike = {
  name?: string;
  message?: string;
};

export function isChunkLoadError(error: unknown): boolean {
  const value = error as ErrorLike | null;
  const text = `${value?.name || ""} ${value?.message || ""}`.toLowerCase();

  return (
    text.includes("chunkloaderror") ||
    text.includes("failed to load chunk") ||
    text.includes("loading chunk") ||
    text.includes("failed to fetch dynamically imported module")
  );
}

export function isRecoverableNavigationError(error: unknown): boolean {
  if (isChunkLoadError(error)) return true;
  const value = error as ErrorLike | null;
  const text = `${value?.name || ""} ${value?.message || ""}`.toLowerCase();

  return (
    text.includes("failed to fetch") ||
    text.includes("networkerror") ||
    text.includes("load failed") ||
    text.includes("unexpected token '<'") ||
    text.includes("unexpected token <") ||
    text.includes("is not valid json") ||
    text.includes("server components render") ||
    text.includes("rsc") ||
    text.includes("502") ||
    text.includes("504") ||
    text.includes("404")
  );
}

export function buildChunkRecoveryUrl(href: string, now = Date.now()): string {
  const url = new URL(href);
  url.searchParams.set(CHUNK_RELOAD_PARAM, String(now));
  return url.toString();
}

function recoveryKey(pathname: string): string {
  return `${CHUNK_RECOVERY_STORAGE_KEY}:${pathname}`;
}

/**
 * A deployment or a Turbopack rebuild can leave an already-open tab pointing
 * at chunk filenames that no longer exist, or an RSC flight request can receive
 * a temporary 502/cached HTML page. A React reset cannot repair that document:
 * it must request the current HTML and chunk map again cleanly.
 */
export function recoverFromChunkLoadError(error: unknown): boolean {
  if (typeof window === "undefined" || !isRecoverableNavigationError(error)) return false;

  const key = recoveryKey(window.location.pathname);
  const now = Date.now();

  try {
    const lastAttempt = Number(window.sessionStorage.getItem(key) || 0);
    if (Number.isFinite(lastAttempt) && now - lastAttempt < RECOVERY_COOLDOWN_MS)
      return false;
    window.sessionStorage.setItem(key, String(now));
  } catch {
    // Storage can be disabled. The cache-busting navigation still recovers the
    // stale document and is safer than leaving the user on a permanent 500.
  }

  window.location.replace(buildChunkRecoveryUrl(window.location.href, now));
  return true;
}

export function retryCurrentDocument(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(recoveryKey(window.location.pathname));
  } catch {
    // The retry must not depend on storage access.
  }

  window.location.replace(buildChunkRecoveryUrl(window.location.href));
}
