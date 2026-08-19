"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

export function ConditionalFooter() {
  const pathname = usePathname();

  // Hide footer only on watch player and full-screen auth pages
  if (
    pathname.startsWith("/watch") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return null;
  }

  return <Footer />;
}
