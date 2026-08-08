import Link from "next/link";
import { ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountPageTabsProps = {
  active: "profile" | "security";
  username?: string | null;
};

const tabClass =
  "relative inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors sm:flex-none";

export function AccountPageTabs({ active, username }: AccountPageTabsProps) {
  const profileHref = username
    ? `/profile/${encodeURIComponent(username)}`
    : "/profile";

  return (
    <nav
      aria-label="Điều hướng tài khoản"
      className="flex w-full items-center gap-1 rounded-xl border border-white/10 bg-[#0c1016] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:w-auto"
    >
      <Link
        href={profileHref}
        aria-current={active === "profile" ? "page" : undefined}
        className={cn(
          tabClass,
          active === "profile"
            ? "bg-white/[0.09] text-white shadow-sm ring-1 ring-violet-300/20"
            : "text-neutral-400 hover:bg-white/[0.05] hover:text-white",
        )}
      >
        <UserRound size={15} strokeWidth={2} />
        <span>Hồ sơ</span>
      </Link>

      <Link
        href="/settings/security"
        aria-current={active === "security" ? "page" : undefined}
        className={cn(
          tabClass,
          active === "security"
            ? "bg-white/[0.09] text-white shadow-sm ring-1 ring-violet-300/20"
            : "text-neutral-400 hover:bg-white/[0.05] hover:text-white",
        )}
      >
        <ShieldCheck size={15} strokeWidth={2} />
        <span>Bảo mật</span>
      </Link>
    </nav>
  );
}
