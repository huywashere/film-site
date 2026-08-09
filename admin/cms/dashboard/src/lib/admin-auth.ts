import { NextRequest, NextResponse } from "next/server";

function configuredCredentials() {
  return {
    username: process.env.ADMIN_DASHBOARD_USERNAME?.trim() || "",
    password: process.env.ADMIN_DASHBOARD_PASSWORD || "",
  };
}

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length, 1);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    difference |=
      (left.charCodeAt(index % Math.max(left.length, 1)) || 0) ^
      (right.charCodeAt(index % Math.max(right.length, 1)) || 0);
  }
  return difference === 0;
}

export function isAdminRequestAuthorized(request: NextRequest): boolean {
  const expected = configuredCredentials();
  if (!expected.username || !expected.password) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Basic ")) return false;

  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    return (
      constantTimeEqual(decoded.slice(0, separator), expected.username) &&
      constantTimeEqual(decoded.slice(separator + 1), expected.password)
    );
  } catch {
    return false;
  }
}

export function adminUnauthorizedResponse(): NextResponse {
  const isMisconfigured =
    process.env.NODE_ENV === "production" &&
    (!process.env.ADMIN_DASHBOARD_USERNAME ||
      !process.env.ADMIN_DASHBOARD_PASSWORD);

  return NextResponse.json(
    {
      error: isMisconfigured
        ? "Admin authentication is not configured"
        : "Authentication required",
    },
    {
      status: isMisconfigured ? 503 : 401,
      headers: isMisconfigured
        ? { "Cache-Control": "no-store" }
        : {
            "WWW-Authenticate": 'Basic realm="CineVerse Admin", charset="UTF-8"',
            "Cache-Control": "no-store",
          },
    },
  );
}
