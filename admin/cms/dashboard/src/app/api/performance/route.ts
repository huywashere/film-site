import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "../../../lib/admin-session";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5_000;
const CACHE_MS = 10_000;
let cached: { expiresAt: number; payload: unknown } | null = null;

function apiBaseUrl() {
  const configured =
    process.env.CINEVERSE_API_URL || "http://127.0.0.1:3001/api/v1";
  try {
    const url = new URL(configured);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    // Return the safe local development default below.
  }
  return "http://127.0.0.1:3001/api/v1";
}

export async function GET(request: NextRequest) {
  if (!hasAdminSession(request)) return NextResponse.json({ message: "Phiên Admin đã hết hạn" }, { status: 401 });
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = performance.now();
  try {
    const token = process.env.ADMIN_METRICS_TOKEN;
    const response = await fetch(`${apiBaseUrl()}/telemetry/metrics`, {
      cache: "no-store",
      headers: token ? { "x-admin-metrics-token": token } : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const metrics = await response.json();
    const payload = {
      available: true,
      probeLatencyMs: Math.round(performance.now() - startedAt),
      metrics,
    };
    cached = { expiresAt: Date.now() + CACHE_MS, payload };
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({
      available: false,
      probeLatencyMs: Math.round(performance.now() - startedAt),
      message:
        error instanceof Error && error.name === "AbortError"
          ? "API metrics quá thời gian phản hồi"
          : "Không thể đọc performance metrics từ API",
    });
  } finally {
    clearTimeout(timer);
  }
}
