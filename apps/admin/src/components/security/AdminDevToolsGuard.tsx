"use client";

/**
 * AdminDevToolsGuard - Disabled in development to prevent false-positive
 * browser redirect loops, DOM wiping, and console flickering.
 */
export function AdminDevToolsGuard() {
  return null;
}

