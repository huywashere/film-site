import Link from "next/link";
import { UserRound, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";

type AccountPageTabsProps = {
  active?: "profile" | "security" | "settings";
  username?: string | null;
};

const tabClass =
  "relative inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors sm:flex-none";

export function AccountPageTabs({ active, username }: AccountPageTabsProps) {
  const profileHref = username
    ? `/user/${encodeURIComponent(username)}`
    : "/user/me";

  return (
    <nav
      aria-label="Điều hướng cài đặt & tài khoản"
      className={cn(
        "flex w-full items-center gap-1 rounded-xl border border-white/10 bg-[#0a0a0a] p-1 shadow-md sm:w-auto",
        cardFont.className,
      )}
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
        href="/settings"
        aria-current={active === "settings" ? "page" : undefined}
        className={cn(
          tabClass,
          active === "settings"
            ? "bg-white/[0.09] text-white shadow-sm ring-1 ring-violet-300/20"
            : "text-neutral-400 hover:bg-white/[0.05] hover:text-white",
        )}
      >
        <Sliders size={15} strokeWidth={2} />
        <span>Trải nghiệm</span>
      </Link>
    </nav>
  );
}
