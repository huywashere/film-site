"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const Navbar = dynamic(
  () => import("./Navbar").then((mod) => mod.Navbar),
  { ssr: true },
);

export function ConditionalNavbar() {
  const pathname = usePathname();
  const isProfileRoute =
    pathname === "/user" ||
    pathname.startsWith("/user/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/");

  if (pathname === "/login" || pathname === "/register" || isProfileRoute) {
    return null;
  }
  return <Navbar />;
}
