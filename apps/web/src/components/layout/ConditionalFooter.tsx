"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const Footer = dynamic(
  () => import("./Footer").then((mod) => mod.Footer),
  { ssr: false },
);

export function ConditionalFooter() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Vercel's static prerender may not expose the pathname here. Keep the
  // server and first browser tree empty, then reveal the home footer after
  // mount so hydration cannot replace the whole application shell.
  if (!mounted || pathname !== "/") {
    return null;
  }

  return <Footer />;
}
