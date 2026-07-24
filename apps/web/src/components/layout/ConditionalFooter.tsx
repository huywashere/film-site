"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

export function ConditionalFooter() {
  const pathname = usePathname();

  // Only render the Footer on the home page ('/')
  if (pathname !== "/") {
    return null;
  }

  return <Footer />;
}
