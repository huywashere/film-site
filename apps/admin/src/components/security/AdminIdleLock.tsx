"use client";

/**
 * AdminIdleLock is permanently disabled per user request.
 * Session safety is now governed strictly by the 24-hour session timeout (AdminSessionSync).
 */
export function AdminIdleLock() {
  return null;
}
