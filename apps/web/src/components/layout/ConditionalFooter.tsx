"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

export function ConditionalFooter() {
  const pathname = usePathname();

  // Only render footer on home page ("/")
  if (pathname !== "/") {
    return null;
  }

  return <Footer />;
}
