import { NextResponse } from "next/server";

/**
 * Simple health check endpoint for frontend uptime monitoring.
 * Used by UptimeRobot / BetterUptime / etc. (ping every 5 minutes).
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "cineverse-web",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        // Allow CDN/proxy to cache for 10s – avoids hammering on high traffic
        "Cache-Control": "public, max-age=10, s-maxage=10",
      },
    },
  );
}
