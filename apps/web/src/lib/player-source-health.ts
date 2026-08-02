export type PlayerErrorKind =
  "manifest" | "segment" | "cors" | "iframe" | "timeout" | "media" | "unknown";

export type SourceHealth = {
  score: number;
  successes: number;
  failures: number;
  lastFailureAt?: number;
  lastError?: PlayerErrorKind;
  updatedAt: number;
};

export type PlayerCandidate = {
  key: string;
  source?: string;
  serverName?: string;
};

// Bump when the player transport changes so a previous implementation cannot
// leave every source on cooldown after a successful player fix.
const STORAGE_KEY = "cineverse_player_source_health_v2";
const COOLDOWN_MS = 2 * 60 * 1000;

function read(): Record<string, SourceHealth> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<
      string,
      SourceHealth
    >;
  } catch {
    return {};
  }
}

function write(data: Record<string, SourceHealth>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable in private browsing. Playback must continue.
  }
}

export function sourceHealthKey(candidate: PlayerCandidate) {
  return [candidate.source || "unknown", candidate.serverName || candidate.key]
    .join(":")
    .toLowerCase();
}

export function getSourceHealth(candidate: PlayerCandidate): SourceHealth {
  return (
    read()[sourceHealthKey(candidate)] || {
      score: 100,
      successes: 0,
      failures: 0,
      updatedAt: 0,
    }
  );
}

export function markSourceSuccess(candidate: PlayerCandidate) {
  const data = read();
  const key = sourceHealthKey(candidate);
  const previous = getSourceHealth(candidate);
  data[key] = {
    ...previous,
    score: Math.min(100, previous.score + 4),
    successes: previous.successes + 1,
    updatedAt: Date.now(),
  };
  write(data);
  return data[key];
}

export function markSourceFailure(
  candidate: PlayerCandidate,
  error: PlayerErrorKind,
) {
  const penalties: Record<PlayerErrorKind, number> = {
    manifest: 25,
    segment: 16,
    cors: 20,
    iframe: 18,
    timeout: 20,
    media: 12,
    unknown: 15,
  };
  const data = read();
  const key = sourceHealthKey(candidate);
  const previous = getSourceHealth(candidate);
  data[key] = {
    ...previous,
    score: Math.max(0, previous.score - penalties[error]),
    failures: previous.failures + 1,
    lastFailureAt: Date.now(),
    lastError: error,
    updatedAt: Date.now(),
  };
  write(data);
  return data[key];
}

export function canTrySource(candidate: PlayerCandidate) {
  const health = getSourceHealth(candidate);
  return (
    !health.lastFailureAt || Date.now() - health.lastFailureAt >= COOLDOWN_MS
  );
}

export function rankHealthyCandidates<T extends PlayerCandidate>(
  candidates: T[],
) {
  return candidates
    .filter(canTrySource)
    .sort((a, b) => getSourceHealth(b).score - getSourceHealth(a).score);
}

export function classifyPlayerError(error: unknown): PlayerErrorKind {
  const value = error as {
    type?: string;
    details?: { type?: string; details?: string; response?: { code?: number } };
    message?: string;
  };
  const detail =
    value.details?.details || value.details?.type || value.type || "";
  const message = `${detail} ${value.message || ""}`.toLowerCase();
  if (message.includes("manifest")) return "manifest";
  if (message.includes("frag") || message.includes("segment")) return "segment";
  if (message.includes("cors") || message.includes("cross-origin"))
    return "cors";
  if (message.includes("iframe")) return "iframe";
  if (message.includes("timeout")) return "timeout";
  if (message.includes("media")) return "media";
  return "unknown";
}
