"use client";

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  // Native scrolling avoids a permanent requestAnimationFrame loop on every
  // route and keeps touch/trackpad input on the browser compositor thread.
  return <>{children}</>;
}
